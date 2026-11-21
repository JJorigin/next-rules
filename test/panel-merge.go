
package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "os"
    "reflect"
    "strings"
)

func parse(file string) map[string]any {
    data, err := os.ReadFile(file)
    must(err)
    result := map[string]any{}
    must(json.Unmarshal(data, &result))
    return result
}
func must(err error) {
    if err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}
func require(ok bool, label string) {
    if !ok { must(fmt.Errorf("check failed: %s", label)) }
}
func main() {
    if len(os.Args) != 3 { must(errors.New("usage: <route-fragment.json> <merged-output.json>")) }
    fragment := parse(os.Args[1])
    frozen, err := json.Marshal(fragment)
    must(err)

    var merged map[string]any
    for _, allowClientDNS := range []bool{false, true} {
        base := map[string]any{
            "mode":"rule", "ipv6":true,
            "dns":map[string]any{"enable":false},
            "tun":map[string]any{"enable":false,"strict-route":true},
            "proxies":[]any{map[string]any{"name":"audit-node","type":"socks5","server":"127.0.0.1","port":1}},
            "proxy-groups":[]any{map[string]any{"name":"PROXY","type":"select","proxies":[]any{"audit-node","DIRECT"}}},
            "rules":[]any{"MATCH,PROXY"},
        }
        beforeDNS := base["dns"]
        beforeTun := base["tun"]
        beforeProxies := base["proxies"]
        must(mergeRemoteClashRules(base, fragment, allowClientDNS))
        require(reflect.DeepEqual(base["rules"], fragment["rules"]), "remote MATCH supersedes the panel fallback")
        rules := base["rules"].([]any)
        require(len(rules)==len(fragment["rules"].([]any)) && strings.HasPrefix(rules[len(rules)-1].(string),"MATCH,🚀"), "final fallback and all guards")
        providers := base["rule-providers"].(map[string]any)
        telegram := providers["next-rules-v2-telegram-ip"].(map[string]any)
        require(telegram["type"]=="http" && telegram["format"]=="mrs" && telegram["path-in-bundle"]=="geo/geoip/telegram.mrs", "Telegram MRS provider")
        groups := base["proxy-groups"].([]any)
        require(clashProxyGroupName(groups[0])=="🚀 默认代理 [自选]" && clashProxyGroupName(groups[len(groups)-1])=="PROXY", "panel group ordering")
        require(groups[0].(map[string]any)["empty-fallback"]=="REJECT", "empty fallback field is carried")
        require(reflect.DeepEqual(beforeDNS,base["dns"]), "remote routing preserves original DNS with either setting")
        require(reflect.DeepEqual(beforeTun,base["tun"]), "TUN survives")
        require(reflect.DeepEqual(beforeProxies,base["proxies"]), "panel nodes survive")
        updated, err := json.Marshal(fragment)
        must(err)
        require(string(frozen)==string(updated), "shared cached source is unmodified")
        merged = base
    }
    result, err := json.MarshalIndent(merged, "", "  ")
    must(err)
    must(os.WriteFile(os.Args[2], result, 0644))
    fmt.Println("3X-UI v3.11.0 upstream merge and route graph validation passed with both DNS options.")
}


type remoteClashKeyClass int

const (
	remoteClashRouteGraph remoteClashKeyClass = iota + 1
	remoteClashClientConfig
)

// Client config keys steer the client's own resolver, so a remote URL may set
// them only when the admin opts in (subClashRemoteDNS).
var remoteClashKeyClasses = map[string]remoteClashKeyClass{
	"proxy-groups":   remoteClashRouteGraph,
	"rule-providers": remoteClashRouteGraph,
	"rules":          remoteClashRouteGraph,
	"dns":            remoteClashClientConfig,
	"sniffer":        remoteClashClientConfig,
}

func remoteClashKeyAllowed(key string, allowClientConfig bool) bool {
	switch remoteClashKeyClasses[key] {
	case remoteClashRouteGraph:
		return true
	case remoteClashClientConfig:
		return allowClientConfig
	default:
		return false
	}
}

// mergeRemoteClashRules copies only keys listed in remoteClashKeyClasses and
// never mutates remote: cached documents are shared.
func mergeRemoteClashRules(base map[string]any, remote map[string]any, allowClientConfig bool) error {
	if len(remote) == 0 {
		return fmt.Errorf("remote Clash routing source must be a YAML map")
	}

	for key, value := range remote {
		if !remoteClashKeyAllowed(key, allowClientConfig) {
			continue
		}
		if remoteClashKeyClasses[key] == remoteClashClientConfig {
			// A malformed dns or sniffer must not cost the client its routing.
			if _, ok := value.(map[string]any); !ok {
				continue
			}
		}
		if err := validateRemoteClashValue(key, value); err != nil {
			return err
		}
		switch key {
		case "rules":
			rules, _ := asAnySlice(value)
			mergeClashRules(base, rules)
		case "proxy-groups":
			groups, _ := asAnySlice(value)
			base["proxy-groups"] = mergeClashProxyGroups(base["proxy-groups"], groups)
		default:
			base[key] = value
		}
	}
	return validateClashRouteGraph(base)
}

func validateRemoteClashValue(key string, value any) error {
	switch key {
	case "rules":
		rules, ok := asAnySlice(value)
		if !ok {
			return fmt.Errorf("remote Clash rules must be a list")
		}
		for _, rule := range rules {
			text, ok := rule.(string)
			if !ok || strings.TrimSpace(text) == "" {
				return fmt.Errorf("remote Clash rules must contain non-empty strings")
			}
		}
	case "proxy-groups":
		groups, ok := asAnySlice(value)
		if !ok {
			return fmt.Errorf("remote Clash proxy-groups must be a list")
		}
		seen := make(map[string]struct{}, len(groups))
		for _, groupValue := range groups {
			group, ok := groupValue.(map[string]any)
			if !ok {
				return fmt.Errorf("remote Clash proxy-groups must contain named group maps with a type")
			}
			name, nameOK := group["name"].(string)
			groupType, typeOK := group["type"].(string)
			if !nameOK || !typeOK || strings.TrimSpace(name) == "" || strings.TrimSpace(groupType) == "" {
				return fmt.Errorf("remote Clash proxy-groups must contain named group maps with a type")
			}
			name = strings.TrimSpace(name)
			if _, duplicate := seen[name]; duplicate {
				return fmt.Errorf("remote Clash proxy-group name %q is duplicated", name)
			}
			seen[name] = struct{}{}
			if useValue, exists := group["use"]; exists {
				use, ok := asAnySlice(useValue)
				if !ok || len(use) > 0 {
					return fmt.Errorf("remote Clash proxy-group %q cannot use proxy-providers", name)
				}
			}
		}
	case "rule-providers":
		providers, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("remote Clash rule-providers must be a map")
		}
		for name, provider := range providers {
			if strings.TrimSpace(name) == "" {
				return fmt.Errorf("remote Clash rule-provider name must not be empty")
			}
			if _, ok := provider.(map[string]any); !ok {
				return fmt.Errorf("remote Clash rule-provider %q must be a map", name)
			}
		}
	}
	return nil
}

func validateClashRouteGraph(config map[string]any) error {
	known := map[string]struct{}{
		"DIRECT": {}, "REJECT": {}, "REJECT-DROP": {}, "REJECT-TINYGIF": {}, "PASS": {}, "GLOBAL": {},
	}
	if proxies, ok := asAnySlice(config["proxies"]); ok {
		for _, value := range proxies {
			proxy, ok := value.(map[string]any)
			if !ok {
				continue
			}
			if name, ok := proxy["name"].(string); ok && strings.TrimSpace(name) != "" {
				known[strings.TrimSpace(name)] = struct{}{}
			}
		}
	}

	groups, _ := asAnySlice(config["proxy-groups"])
	for _, value := range groups {
		if name := clashProxyGroupName(value); name != "" {
			known[name] = struct{}{}
		}
	}
	for _, value := range groups {
		group, ok := value.(map[string]any)
		if !ok {
			continue
		}
		name := clashProxyGroupName(group)
		refs, exists := group["proxies"]
		if !exists {
			continue
		}
		proxies, ok := asAnySlice(refs)
		if !ok {
			return fmt.Errorf("Clash proxy-group %q proxies must be a list", name)
		}
		for _, refValue := range proxies {
			ref, ok := refValue.(string)
			if !ok || strings.TrimSpace(ref) == "" {
				return fmt.Errorf("Clash proxy-group %q contains an invalid proxy reference", name)
			}
			ref = strings.TrimSpace(ref)
			if _, exists := known[ref]; !exists {
				return fmt.Errorf("Clash proxy-group %q references unknown proxy or group %q", name, ref)
			}
		}
	}

	providers, _ := config["rule-providers"].(map[string]any)
	for providerName, value := range providers {
		provider, ok := value.(map[string]any)
		if !ok {
			continue
		}
		via, ok := provider["proxy"].(string)
		if !ok || strings.TrimSpace(via) == "" {
			continue
		}
		via = strings.TrimSpace(via)
		if _, exists := known[via]; !exists {
			return fmt.Errorf("Clash rule-provider %q references unknown proxy or group %q", providerName, via)
		}
	}

	rules, _ := asAnySlice(config["rules"])
	for _, value := range rules {
		rule, ok := value.(string)
		if !ok || strings.TrimSpace(rule) == "" {
			return errors.New("Clash rules must contain non-empty strings")
		}
		parts := strings.Split(rule, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		if len(parts) < 2 {
			return fmt.Errorf("invalid Clash rule %q", rule)
		}
		if strings.EqualFold(parts[0], "RULE-SET") {
			if len(parts) < 3 {
				return fmt.Errorf("invalid Clash RULE-SET rule %q", rule)
			}
			if _, exists := providers[parts[1]]; !exists {
				return fmt.Errorf("Clash rule references unknown rule-provider %q", parts[1])
			}
		}
		targetIndex := len(parts) - 1
		// Mihomo IP rules may carry trailing no-resolve / src option flags.
		for targetIndex >= 1 && (strings.EqualFold(parts[targetIndex], "no-resolve") || strings.EqualFold(parts[targetIndex], "src")) {
			targetIndex--
		}
		if targetIndex < 1 {
			return fmt.Errorf("invalid Clash rule target in %q", rule)
		}
		target := parts[targetIndex]
		if _, exists := known[target]; !exists {
			return fmt.Errorf("Clash rule references unknown proxy or group %q", target)
		}
	}
	return nil
}

func mergeClashProxyGroups(baseValue any, remoteGroups []any) []any {
	baseGroups, _ := asAnySlice(baseValue)
	baseByName := make(map[string]any, len(baseGroups))
	baseOrder := make([]string, 0, len(baseGroups))
	for _, group := range baseGroups {
		name := clashProxyGroupName(group)
		if name == "" {
			continue
		}
		baseByName[name] = group
		baseOrder = append(baseOrder, name)
	}

	merged := make([]any, 0, len(remoteGroups)+len(baseGroups))
	seen := make(map[string]struct{}, len(remoteGroups)+len(baseGroups))
	for _, group := range remoteGroups {
		name := clashProxyGroupName(group)
		if name == "" {
			continue
		}
		if _, duplicate := seen[name]; duplicate {
			continue
		}
		seen[name] = struct{}{}
		merged = append(merged, group)
	}
	for _, name := range baseOrder {
		if _, replaced := seen[name]; replaced {
			continue
		}
		merged = append(merged, baseByName[name])
	}
	return merged
}

func clashProxyGroupName(value any) string {
	group, ok := value.(map[string]any)
	if !ok {
		return ""
	}
	name, _ := group["name"].(string)
	return strings.TrimSpace(name)
}

func mergeClashRules(base map[string]any, customRules []any) {
	if len(customRules) == 0 {
		return
	}

	baseRules, _ := asAnySlice(base["rules"])
	if hasClashMatchRule(customRules) {
		base["rules"] = customRules
		return
	}

	merged := make([]any, 0, len(customRules)+len(baseRules))
	merged = append(merged, customRules...)
	merged = append(merged, baseRules...)
	base["rules"] = merged
}

func asAnySlice(value any) ([]any, bool) {
	switch typed := value.(type) {
	case []any:
		return typed, true
	case []string:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, item)
		}
		return out, true
	case []map[string]any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, item)
		}
		return out, true
	default:
		return nil, false
	}
}

func hasClashMatchRule(rules []any) bool {
	for _, rule := range rules {
		ruleText, ok := rule.(string)
		if !ok {
			continue
		}
		parts := strings.SplitN(ruleText, ",", 2)
		if strings.EqualFold(strings.TrimSpace(parts[0]), "MATCH") {
			return true
		}
	}
	return false
}

func linesToClashRules(raw string) []any {
	lines := strings.Split(raw, "\n")
	rules := make([]any, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		rules = append(rules, line)
	}
	return rules
}
