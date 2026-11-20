// Generate an ephemeral certificate only for the isolated loopback DoH test.
package main

import (
    "crypto/ecdsa"
    "crypto/elliptic"
    "crypto/rand"
    "crypto/x509"
    "crypto/x509/pkix"
    "encoding/pem"
    "math/big"
    "net"
    "os"
    "path/filepath"
    "time"
)

func main() {
    if len(os.Args) != 2 { panic("expected isolated test directory") }
    key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
    if err != nil { panic(err) }
    serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
    if err != nil { panic(err) }
    template := &x509.Certificate{
        SerialNumber: serial, Subject: pkix.Name{CommonName: "Next-Rules loopback DNS test"},
        NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(24*time.Hour),
        KeyUsage: x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
        ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
        IsCA: true, BasicConstraintsValid: true,
        IPAddresses: []net.IP{net.ParseIP("127.0.0.1")},
        DNSNames: []string{"resolver.audit.iana.org"},
    }
    cert, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
    if err != nil { panic(err) }
    encodedKey, err := x509.MarshalPKCS8PrivateKey(key)
    if err != nil { panic(err) }
    if err = os.WriteFile(filepath.Join(os.Args[1], "cert.pem"), pem.EncodeToMemory(&pem.Block{Type:"CERTIFICATE",Bytes:cert}), 0600); err != nil { panic(err) }
    if err = os.WriteFile(filepath.Join(os.Args[1], "key.pem"), pem.EncodeToMemory(&pem.Block{Type:"PRIVATE KEY",Bytes:encodedKey}), 0600); err != nil { panic(err) }
}
