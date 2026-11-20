// Next-Rules 2.0 · Clash Verge Rev 订阅扩展脚本
// 由 node tools/build-v2.cjs 生成。发布说明和迁移步骤见 README。

const POLICY = {
  "version": "2.0",
  "group": {
    "auto": "♻️ 自动选择 [系统]",
    "default": "🚀 默认代理 [自选]",
    "ai": "🤖 AI服务 [自选]",
    "google": "🔍 谷歌服务(含油管) [自选]",
    "media": "🎬 流媒体 [自选]",
    "telegram": "💬 电报专用 [自选]",
    "microsoft": "Ⓜ️ 微软服务 [自选]",
    "apple": "🍎 苹果服务 [自选]",
    "crypto": "💰 币圈专用 [自选]",
    "software": "🖥️ 软件分流 [自选]",
    "ads": "🛑 广告拦截 [系统]"
  },
  "providers": {
    "next-rules-v2-ai": {
      "type": "inline",
      "behavior": "classical",
      "payload": [
        "DOMAIN-SUFFIX,firefly.adobe.com",
        "DOMAIN-SUFFIX,firefly.adobe.io",
        "DOMAIN,aws-language-servers.us-east-1.amazonaws.com",
        "DOMAIN,aws-toolkit-language-servers.amazonaws.com",
        "DOMAIN,codewhisperer.us-east-1.amazonaws.com",
        "DOMAIN,idetoolkits-hostedfiles.amazonaws.com",
        "DOMAIN,idetoolkits.amazonwebservices.com",
        "DOMAIN,q-developer-integration.us-east-1.api.aws",
        "DOMAIN-SUFFIX,q.eu-central-1.amazonaws.com",
        "DOMAIN-SUFFIX,q.us-east-1.amazonaws.com",
        "DOMAIN-SUFFIX,anthropic.com",
        "DOMAIN-SUFFIX,claude.ai",
        "DOMAIN-SUFFIX,claude.app",
        "DOMAIN-SUFFIX,claude.com",
        "DOMAIN-SUFFIX,claude.new",
        "DOMAIN-SUFFIX,claude.site",
        "DOMAIN-SUFFIX,claudemcpclient.com",
        "DOMAIN-SUFFIX,claudemcpcontent.com",
        "DOMAIN-SUFFIX,claudepages.dev",
        "DOMAIN-SUFFIX,claudestudio.com",
        "DOMAIN-SUFFIX,claudeusercontent.com",
        "IP-CIDR,160.79.104.0/21,no-resolve",
        "IP-CIDR6,2607:6bc0::/32,no-resolve",
        "DOMAIN,anthropic.auth0.com",
        "DOMAIN,anthropic.com.cdn.cloudflare.net",
        "DOMAIN,servd-anthropic-website.b-cdn.net",
        "DOMAIN-SUFFIX,augmentcode.com",
        "DOMAIN-SUFFIX,bfl.ai",
        "DOMAIN-SUFFIX,bolt.new",
        "DOMAIN-SUFFIX,coze.com",
        "DOMAIN-SUFFIX,trae.ai",
        "DOMAIN-SUFFIX,cerebras.ai",
        "DOMAIN-SUFFIX,character.ai",
        "DOMAIN-SUFFIX,chutes.ai",
        "DOMAIN-SUFFIX,civitai.com",
        "DOMAIN-SUFFIX,cline.bot",
        "DOMAIN-SUFFIX,clipdrop.co",
        "DOMAIN-SUFFIX,ai.cloudflare.com",
        "DOMAIN-SUFFIX,coderabbit.ai",
        "DOMAIN-SUFFIX,cohere.ai",
        "DOMAIN-SUFFIX,cohere.com",
        "DOMAIN-SUFFIX,comfy.org",
        "DOMAIN-SUFFIX,comfyregistry.org",
        "DOMAIN-SUFFIX,commandcode.ai",
        "DOMAIN-SUFFIX,continue.dev",
        "DOMAIN-SUFFIX,copilot.microsoft.com",
        "DOMAIN-SUFFIX,githubcopilot.com",
        "DOMAIN,copilot-proxy.githubusercontent.com",
        "DOMAIN,copilot-workspace.githubnext.com",
        "DOMAIN,copilotprodattachments.blob.core.windows.net",
        "DOMAIN,production-copilot-host-westus.webpubsub.azure.com",
        "DOMAIN,sydney.bing.com",
        "DOMAIN-SUFFIX,crewai.com",
        "DOMAIN-SUFFIX,cursor-cdn.com",
        "DOMAIN-SUFFIX,cursor.com",
        "DOMAIN-SUFFIX,cursor.sh",
        "DOMAIN-SUFFIX,cursorapi.com",
        "DOMAIN-SUFFIX,cursorvm.com",
        "DOMAIN-SUFFIX,deepinfra.com",
        "DOMAIN-SUFFIX,descript.com",
        "DOMAIN-SUFFIX,devin.ai",
        "DOMAIN-SUFFIX,diabrowser.com",
        "DOMAIN-SUFFIX,diabrowser.engineering",
        "DOMAIN-SUFFIX,dify.ai",
        "DOMAIN-SUFFIX,duck.ai",
        "DOMAIN-SUFFIX,eigent.ai",
        "DOMAIN-SUFFIX,elevenlabs.com",
        "DOMAIN-SUFFIX,elevenlabs.io",
        "DOMAIN-SUFFIX,factory.ai",
        "DOMAIN-SUFFIX,fireworks.ai",
        "DOMAIN-SUFFIX,gamma.app",
        "DOMAIN-SUFFIX,genspark.ai",
        "DOMAIN-SUFFIX,ai.google.dev",
        "DOMAIN-SUFFIX,ai.studio",
        "DOMAIN-SUFFIX,aistudio.google.com",
        "DOMAIN-SUFFIX,antigravity.google",
        "DOMAIN-SUFFIX,antigravity.google.com",
        "DOMAIN-SUFFIX,bard.google.com",
        "DOMAIN-SUFFIX,deepmind.com",
        "DOMAIN-SUFFIX,deepmind.google",
        "DOMAIN-SUFFIX,gemini.google",
        "DOMAIN-SUFFIX,gemini.google.com",
        "DOMAIN-SUFFIX,generativeai.google",
        "DOMAIN-SUFFIX,generativelanguage.googleapis.com",
        "DOMAIN-SUFFIX,notebooklm.google",
        "DOMAIN-SUFFIX,notebooklm.google.com",
        "DOMAIN,alkalicore-pa.clients6.google.com",
        "DOMAIN,alkalimakersuite-pa.clients6.google.com",
        "DOMAIN,antigravity-pa.googleapis.com",
        "DOMAIN,antigravity.googleapis.com",
        "DOMAIN,appsgenaiserver-pa.clients.google.com",
        "DOMAIN,appsgenaiserver-pa.clients6.google.com",
        "DOMAIN,appsgenaiserver-pa.googleapis.com",
        "DOMAIN,geminiweb-pa.clients.google.com",
        "DOMAIN,geminiweb-pa.clients6.google.com",
        "DOMAIN,notebooklm-pa.googleapis.com",
        "DOMAIN,notebooklm.googleapis.com",
        "DOMAIN,webchannel-alkalimakersuite-pa.clients6.google.com",
        "DOMAIN,aisandbox-pa.googleapis.com",
        "DOMAIN,flow.google",
        "DOMAIN,flow.google.com",
        "DOMAIN,gemini.gstatic.com",
        "DOMAIN,jules.google",
        "DOMAIN,jules.google.com",
        "DOMAIN,opal.google",
        "DOMAIN,opal.google.com",
        "DOMAIN,stitch.withgoogle.com",
        "DOMAIN-SUFFIX,grammarly.com",
        "DOMAIN-SUFFIX,groq.com",
        "DOMAIN-SUFFIX,h2o.ai",
        "DOMAIN-SUFFIX,hermes-agent.nousresearch.com",
        "DOMAIN-SUFFIX,heygen.com",
        "DOMAIN-SUFFIX,hf.co",
        "DOMAIN-SUFFIX,huggingface.co",
        "DOMAIN-SUFFIX,ideogram.ai",
        "DOMAIN-SUFFIX,inflection.ai",
        "DOMAIN-SUFFIX,pi.ai",
        "DOMAIN-SUFFIX,jasper.ai",
        "DOMAIN-SUFFIX,grazie.ai",
        "DOMAIN-SUFFIX,grazie.aws.intellij.net",
        "DOMAIN-SUFFIX,jetbrains.ai",
        "DOMAIN-SUFFIX,kilo.ai",
        "DOMAIN-SUFFIX,kilo.codes",
        "DOMAIN-SUFFIX,kiro.dev",
        "DOMAIN-SUFFIX,langchain.com",
        "DOMAIN-SUFFIX,leonardo.ai",
        "DOMAIN-SUFFIX,lmarena.ai",
        "DOMAIN-SUFFIX,lmstudio.ai",
        "DOMAIN-SUFFIX,lovable.dev",
        "DOMAIN-SUFFIX,lumalabs.ai",
        "DOMAIN,ai.developer.meta.com",
        "DOMAIN,ai.meta.com",
        "DOMAIN,aidemos.meta.com",
        "DOMAIN,llama.developer.meta.com",
        "DOMAIN-SUFFIX,llama.com",
        "DOMAIN-SUFFIX,llamameta.net",
        "DOMAIN-SUFFIX,meta.ai",
        "DOMAIN-SUFFIX,metaaiusercontent.com",
        "DOMAIN-SUFFIX,metaaivm.com",
        "DOMAIN-SUFFIX,midjourney.com",
        "DOMAIN-SUFFIX,mistral.ai",
        "DOMAIN-SUFFIX,novita.ai",
        "DOMAIN-SUFFIX,ollama.com",
        "DOMAIN-SUFFIX,chat.com",
        "DOMAIN-SUFFIX,chatgpt.com",
        "DOMAIN-SUFFIX,chatgpt.livekit.cloud",
        "DOMAIN-SUFFIX,crixet.com",
        "DOMAIN-SUFFIX,oaistatic.com",
        "DOMAIN-SUFFIX,oaiusercontent.com",
        "DOMAIN-SUFFIX,openai.com",
        "DOMAIN-SUFFIX,openaiapi-site.azureedge.net",
        "DOMAIN-SUFFIX,openaicom.imgix.net",
        "DOMAIN-SUFFIX,sora.com",
        "IP-CIDR,199.47.142.0/23,no-resolve",
        "IP-CIDR6,2604:f20::/32,no-resolve",
        "DOMAIN,openai-api.arkoselabs.com",
        "DOMAIN,openaiassets.blob.core.windows.net",
        "DOMAIN,openaicom-api-bdcpf8c6d2e9atf6.z01.azurefd.net",
        "DOMAIN,openaicomproductionae4b.blob.core.windows.net",
        "DOMAIN,production-openaicom-storage.azureedge.net",
        "DOMAIN,openai.com.cdn.cloudflare.net",
        "DOMAIN,cdn.openaimerge.com",
        "DOMAIN-SUFFIX,openart.ai",
        "DOMAIN-SUFFIX,openclaw.ai",
        "DOMAIN-SUFFIX,opencode.ai",
        "DOMAIN-SUFFIX,openrouter.ai",
        "DOMAIN-SUFFIX,otter.ai",
        "DOMAIN,ppl-ai-file-upload.s3.amazonaws.com",
        "DOMAIN,pplx-res.cloudinary.com",
        "DOMAIN-SUFFIX,perplexity.ai",
        "DOMAIN-SUFFIX,perplexity.com",
        "DOMAIN-SUFFIX,pplx.ai",
        "DOMAIN-SUFFIX,phind.com",
        "DOMAIN-SUFFIX,pika.art",
        "DOMAIN-SUFFIX,poe.com",
        "DOMAIN-SUFFIX,poecdn.net",
        "DOMAIN-SUFFIX,recraft.ai",
        "DOMAIN-SUFFIX,replicate.com",
        "DOMAIN-SUFFIX,replicate.delivery",
        "DOMAIN-SUFFIX,replit.com",
        "DOMAIN-SUFFIX,runway.com",
        "DOMAIN-SUFFIX,runwayml.com",
        "DOMAIN-SUFFIX,ampcode.com",
        "DOMAIN-SUFFIX,ampworkers.com",
        "DOMAIN-SUFFIX,cody.dev",
        "DOMAIN-SUFFIX,sourcegraph.com",
        "DOMAIN-SUFFIX,stability.ai",
        "DOMAIN-SUFFIX,suno.ai",
        "DOMAIN-SUFFIX,suno.com",
        "DOMAIN-SUFFIX,synthesia.io",
        "DOMAIN-SUFFIX,tabnine.com",
        "DOMAIN-SUFFIX,together.ai",
        "DOMAIN-SUFFIX,together.xyz",
        "DOMAIN-SUFFIX,udio.com",
        "DOMAIN-SUFFIX,v0.app",
        "DOMAIN-SUFFIX,v0.dev",
        "DOMAIN-SUFFIX,codeium.com",
        "DOMAIN-SUFFIX,codeiumdata.com",
        "DOMAIN-SUFFIX,windsurf.build",
        "DOMAIN-SUFFIX,windsurf.com",
        "DOMAIN-SUFFIX,grok.com",
        "DOMAIN-SUFFIX,grok.x.com",
        "DOMAIN-SUFFIX,grokbot.com",
        "DOMAIN-SUFFIX,grokipedia.com",
        "DOMAIN-SUFFIX,x.ai",
        "DOMAIN-SUFFIX,you.com",
        "DOMAIN-SUFFIX,youmind.ai",
        "DOMAIN-SUFFIX,youmind.com",
        "DOMAIN-SUFFIX,youmind.site",
        "DOMAIN-SUFFIX,zed.dev"
      ]
    },
    "next-rules-v2-ai-voice": {
      "type": "inline",
      "behavior": "ipcidr",
      "payload": [
        "4.150.48.254/32",
        "4.151.50.34/32",
        "4.151.125.58/32",
        "4.151.146.120/32",
        "4.151.150.176/32",
        "4.151.162.218/32",
        "4.151.178.112/32",
        "4.151.200.38/32",
        "4.151.204.68/32",
        "4.154.76.98/32",
        "4.155.146.196/32",
        "4.155.233.173/32",
        "4.190.204.74/32",
        "4.197.155.147/32",
        "4.197.172.116/32",
        "4.197.185.255/32",
        "4.201.104.14/32",
        "4.201.155.22/32",
        "4.201.169.177/32",
        "4.201.186.94/32",
        "4.213.138.217/32",
        "4.217.222.97/32",
        "4.217.235.100/32",
        "4.218.14.95/32",
        "4.225.200.166/32",
        "4.225.221.123/32",
        "4.232.88.121/32",
        "4.242.133.59/32",
        "4.245.198.13/32",
        "4.246.114.35/32",
        "4.255.228.31/32",
        "9.160.35.238/32",
        "9.160.36.206/32",
        "9.160.37.69/32",
        "9.160.37.102/32",
        "9.160.37.127/32",
        "9.160.37.213/32",
        "9.160.160.178/32",
        "9.160.163.154/32",
        "9.160.164.236/32",
        "9.160.165.37/32",
        "9.205.94.183/32",
        "9.205.94.184/32",
        "9.205.154.223/32",
        "9.205.159.112/32",
        "9.205.159.128/32",
        "9.205.159.144/32",
        "9.205.248.20/32",
        "9.205.248.21/32",
        "9.205.248.42/32",
        "9.205.248.77/32",
        "9.205.248.226/32",
        "9.205.250.159/32",
        "13.71.25.29/32",
        "13.78.35.240/32",
        "13.78.198.12/32",
        "13.87.67.156/32",
        "20.9.6.44/32",
        "20.9.65.240/32",
        "20.12.176.106/32",
        "20.12.214.56/32",
        "20.25.136.71/32",
        "20.25.176.169/32",
        "20.29.73.138/32",
        "20.29.94.5/32",
        "20.29.106.142/32",
        "20.29.109.127/32",
        "20.37.248.26/32",
        "20.38.171.133/32",
        "20.41.97.13/32",
        "20.41.220.129/32",
        "20.42.209.232/32",
        "20.42.216.2/32",
        "20.45.59.121/32",
        "20.55.129.73/32",
        "20.58.186.41/32",
        "20.59.119.195/32",
        "20.61.69.127/32",
        "20.63.211.30/32",
        "20.66.44.126/32",
        "20.69.27.102/32",
        "20.70.32.20/32",
        "20.70.109.186/32",
        "20.74.221.21/32",
        "20.78.149.97/32",
        "20.83.246.205/32",
        "20.85.214.85/32",
        "20.86.156.204/32",
        "20.89.40.149/32",
        "20.89.98.73/32",
        "20.89.101.223/32",
        "20.89.130.145/32",
        "20.89.216.20/32",
        "20.89.236.125/32",
        "20.97.18.7/32",
        "20.98.53.205/32",
        "20.98.94.72/32",
        "20.106.75.64/32",
        "20.107.200.148/32",
        "20.113.195.227/32",
        "20.113.199.182/32",
        "20.113.204.227/32",
        "20.113.205.18/32",
        "20.113.207.178/32",
        "20.113.209.102/32",
        "20.114.70.148/32",
        "20.118.36.228/32",
        "20.118.174.239/32",
        "20.125.96.144/32",
        "20.125.120.177/32",
        "20.125.138.65/32",
        "20.162.96.163/32",
        "20.165.41.24/32",
        "20.165.148.234/32",
        "20.165.155.240/32",
        "20.165.158.214/32",
        "20.168.16.20/32",
        "20.168.16.99/32",
        "20.168.48.117/32",
        "20.168.65.250/32",
        "20.168.72.85/32",
        "20.169.22.39/32",
        "20.169.33.151/32",
        "20.169.33.200/32",
        "20.171.68.30/32",
        "20.171.97.109/32",
        "20.171.138.58/32",
        "20.171.252.186/32",
        "20.184.36.134/32",
        "20.190.104.59/32",
        "20.193.73.108/32",
        "20.194.51.26/32",
        "20.195.180.205/32",
        "20.195.185.53/32",
        "20.195.188.32/32",
        "20.195.188.94/32",
        "20.196.195.248/32",
        "20.197.177.17/32",
        "20.197.179.218/32",
        "20.197.180.156/32",
        "20.197.192.104/32",
        "20.198.73.88/32",
        "20.199.240.35/32",
        "20.203.136.26/32",
        "20.203.144.245/32",
        "20.203.145.145/32",
        "20.203.145.225/32",
        "20.203.241.30/32",
        "20.206.69.234/32",
        "20.206.90.17/32",
        "20.207.196.19/32",
        "20.207.197.123/32",
        "20.207.202.126/32",
        "20.210.247.237/32",
        "20.211.28.213/32",
        "20.211.100.168/32",
        "20.211.124.176/32",
        "20.211.160.187/32",
        "20.211.204.106/32",
        "20.211.207.196/32",
        "20.211.232.159/32",
        "20.212.83.76/32",
        "20.213.73.163/32",
        "20.214.186.125/32",
        "20.214.225.136/32",
        "20.215.51.56/32",
        "20.215.69.18/32",
        "20.215.189.48/32",
        "20.215.211.9/32",
        "20.215.219.87/32",
        "20.215.248.137/32",
        "20.215.253.155/32",
        "20.215.254.178/32",
        "20.218.37.123/32",
        "20.218.43.103/32",
        "20.219.11.5/32",
        "20.219.56.35/32",
        "20.219.100.169/32",
        "20.219.102.5/32",
        "20.219.109.3/32",
        "20.219.120.240/32",
        "20.219.124.186/32",
        "20.225.138.3/32",
        "20.225.156.200/32",
        "20.226.2.110/32",
        "20.226.19.149/32",
        "20.226.20.169/32",
        "20.226.21.227/32",
        "20.226.25.167/32",
        "20.226.36.119/32",
        "20.226.36.140/32",
        "20.226.38.105/32",
        "20.226.40.52/32",
        "20.226.41.247/32",
        "20.226.42.137/32",
        "20.226.51.38/32",
        "20.226.52.74/32",
        "20.226.74.46/32",
        "20.226.84.92/32",
        "20.226.86.24/32",
        "20.226.89.95/32",
        "20.226.104.46/32",
        "20.229.39.45/32",
        "20.229.39.104/32",
        "20.230.47.206/32",
        "20.234.111.90/32",
        "20.236.64.56/32",
        "20.236.141.128/32",
        "20.237.207.200/32",
        "20.242.22.99/32",
        "20.242.106.26/32",
        "20.245.11.12/32",
        "20.245.239.248/32",
        "20.248.121.10/32",
        "20.250.8.66/32",
        "20.253.201.211/32",
        "23.101.123.148/32",
        "23.101.216.138/32",
        "23.101.226.95/32",
        "40.64.120.63/32",
        "40.75.170.15/32",
        "40.112.161.169/32",
        "40.115.143.140/32",
        "40.118.236.137/32",
        "40.124.7.113/32",
        "48.193.40.95/32",
        "48.193.41.10/32",
        "48.193.41.165/32",
        "51.4.112.173/32",
        "51.57.68.153/32",
        "51.57.79.182/32",
        "51.103.128.240/32",
        "51.107.168.125/32",
        "51.107.175.203/32",
        "51.107.225.131/32",
        "51.107.238.19/32",
        "51.107.238.43/32",
        "51.116.3.178/32",
        "51.116.3.185/32",
        "51.116.82.1/32",
        "51.116.84.241/32",
        "51.116.89.99/32",
        "51.116.89.102/32",
        "51.116.220.101/32",
        "52.141.0.43/32",
        "52.141.4.85/32",
        "52.143.181.161/32",
        "52.148.5.163/32",
        "52.150.164.49/32",
        "52.157.177.65/32",
        "52.159.141.180/32",
        "52.182.134.239/32",
        "52.188.65.158/32",
        "52.188.151.95/32",
        "52.230.89.145/32",
        "52.233.253.172/32",
        "52.234.45.139/32",
        "52.236.51.132/32",
        "52.241.6.99/32",
        "52.243.62.231/32",
        "52.247.69.68/32",
        "52.253.104.78/32",
        "52.253.109.90/32",
        "52.253.109.199/32",
        "57.154.22.182/32",
        "57.154.40.120/32",
        "57.154.42.34/32",
        "57.154.51.173/32",
        "57.154.55.99/32",
        "57.154.67.255/32",
        "64.236.175.115/32",
        "68.155.152.41/32",
        "68.221.76.47/32",
        "68.221.176.216/32",
        "68.221.200.92/32",
        "70.153.83.155/32",
        "70.153.147.32/32",
        "70.153.147.96/32",
        "70.153.148.19/32",
        "70.153.150.120/32",
        "70.153.151.108/32",
        "72.146.20.246/32",
        "72.146.45.116/32",
        "74.7.32.33/32",
        "74.7.32.69/32",
        "74.7.32.207/32",
        "74.7.33.71/32",
        "74.7.33.139/32",
        "74.7.33.140/32",
        "74.152.48.241/32",
        "74.152.49.125/32",
        "74.159.28.251/32",
        "74.159.51.54/32",
        "74.159.51.124/32",
        "74.225.202.57/32",
        "74.225.219.218/32",
        "74.248.19.80/32",
        "74.248.21.91/32",
        "74.248.21.95/32",
        "74.248.32.218/32",
        "74.248.34.11/32",
        "74.248.35.12/32",
        "74.248.35.102/32",
        "74.248.36.40/32",
        "74.248.120.121/32",
        "74.248.136.89/32",
        "74.248.148.7/32",
        "74.249.207.14/32",
        "74.249.241.198/32",
        "74.249.249.6/32",
        "85.211.180.16/32",
        "85.211.180.65/32",
        "85.211.181.109/32",
        "85.211.182.61/32",
        "85.211.193.130/32",
        "85.211.195.125/32",
        "85.211.241.13/32",
        "85.211.245.237/32",
        "85.211.247.9/32",
        "102.37.57.54/32",
        "104.211.223.134/32",
        "104.215.182.146/32",
        "128.24.72.208/32",
        "128.24.89.254/32",
        "128.203.193.150/32",
        "130.33.52.154/32",
        "130.131.63.28/32",
        "130.131.193.230/32",
        "130.131.217.150/32",
        "130.131.242.81/32",
        "132.196.3.237/32",
        "132.196.88.56/32",
        "134.138.48.99/32",
        "134.138.48.132/32",
        "134.138.48.156/32",
        "134.138.48.201/32",
        "134.138.48.220/32",
        "134.138.49.186/32",
        "134.138.49.233/32",
        "134.138.50.85/32",
        "134.138.50.120/32",
        "134.138.50.121/32",
        "134.138.50.190/32",
        "134.138.50.236/32",
        "135.119.54.176/32",
        "135.220.40.201/32",
        "135.225.27.170/32",
        "135.234.25.52/32",
        "137.116.45.81/32",
        "138.91.23.93/32",
        "158.158.35.12/32",
        "158.158.43.147/32",
        "158.158.47.203/32",
        "158.158.54.76/32",
        "158.158.72.151/32",
        "158.158.96.28/32",
        "158.158.98.53/32",
        "158.158.101.5/32",
        "158.158.104.5/32",
        "172.166.108.88/32",
        "172.167.99.101/32",
        "172.173.91.17/32",
        "172.176.115.233/32",
        "172.178.132.252/32",
        "172.182.200.81/32",
        "172.183.195.174/32",
        "172.184.108.82/32",
        "172.184.136.176/32",
        "172.184.143.123/32",
        "172.196.32.32/32",
        "172.196.41.217/32",
        "172.196.43.82/32",
        "172.196.43.226/32",
        "172.196.50.223/32",
        "172.198.75.176/32",
        "172.198.138.215/32",
        "172.198.138.218/32",
        "172.200.47.199/32",
        "172.202.23.232/32",
        "172.202.168.144/32",
        "172.202.169.179/32",
        "172.202.198.115/32",
        "172.202.198.128/32",
        "172.203.39.49/32",
        "172.204.24.194/32",
        "172.204.25.108/32",
        "172.204.26.187/32",
        "172.204.26.194/32",
        "172.207.173.200/32",
        "172.212.162.141/32",
        "172.212.177.184/32",
        "172.212.183.151/32",
        "172.212.186.208/32",
        "172.213.16.221/32",
        "172.214.226.198/32",
        "172.214.254.250/32",
        "172.215.136.137/32",
        "191.232.51.120/32",
        "191.232.190.216/32",
        "191.232.198.181/32",
        "191.233.251.27/32",
        "191.235.237.21/32"
      ]
    },
    "next-rules-v2-ai-process": {
      "type": "inline",
      "behavior": "classical",
      "payload": [
        "PROCESS-NAME,Claude",
        "PROCESS-NAME,Claude.exe",
        "PROCESS-NAME,ChatGPT",
        "PROCESS-NAME,ChatGPT.exe",
        "PROCESS-NAME,Codex",
        "PROCESS-NAME,Codex.exe",
        "PROCESS-NAME,Cursor",
        "PROCESS-NAME,Cursor.exe",
        "PROCESS-NAME,Antigravity",
        "PROCESS-NAME,Antigravity.exe",
        "PROCESS-NAME,Windsurf",
        "PROCESS-NAME,Windsurf.exe",
        "PROCESS-NAME,Augment",
        "PROCESS-NAME,Augment.exe",
        "PROCESS-NAME,cowork-svc.exe"
      ]
    },
    "next-rules-v2-software": {
      "type": "inline",
      "behavior": "classical",
      "payload": [
        "PROCESS-NAME-WILDCARD,*Discord*",
        "PROCESS-NAME-WILDCARD,*Steam*",
        "PROCESS-NAME-WILDCARD,*EpicGames*",
        "PROCESS-NAME-WILDCARD,*WhatsApp*"
      ]
    },
    "next-rules-v2-ads": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/ads.yaml",
      "interval": 86400
    },
    "next-rules-v2-disney": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/disney.yaml",
      "interval": 86400
    },
    "next-rules-v2-crypto": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/crypto.yaml",
      "interval": 86400
    },
    "next-rules-v2-telegram-ip": {
      "type": "http",
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs",
      "interval": 86400,
      "path-in-bundle": "geo/geoip/telegram.mrs"
    }
  },
  "routes": [
    [
      "GEOSITE,private",
      "DIRECT"
    ],
    [
      "GEOIP,private,no-resolve",
      "DIRECT"
    ],
    [
      "DOMAIN-SUFFIX,anthropic.com.cn",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,apple-cn",
      "DIRECT"
    ],
    [
      "GEOSITE,microsoft@cn",
      "DIRECT"
    ],
    [
      "GEOSITE,steam@cn",
      "DIRECT"
    ],
    [
      "GEOSITE,CN",
      "DIRECT"
    ],
    [
      "RULE-SET,next-rules-v2-ai",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOIP,CN,no-resolve",
      "DIRECT"
    ],
    [
      [
        "NETWORK,UDP",
        "DST-PORT,3478",
        "RULE-SET,next-rules-v2-ai-voice,no-resolve"
      ],
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-ads",
      "🛑 广告拦截 [系统]"
    ],
    [
      "GEOSITE,youtube",
      "🔍 谷歌服务(含油管) [自选]",
      true
    ],
    [
      "GEOSITE,google",
      "🔍 谷歌服务(含油管) [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-crypto",
      "💰 币圈专用 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-disney",
      "🎬 流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,netflix",
      "🎬 流媒体 [自选]",
      true
    ],
    [
      "GEOIP,netflix,no-resolve",
      "🎬 流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,apple",
      "🍎 苹果服务 [自选]",
      true
    ],
    [
      "GEOSITE,telegram",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-telegram-ip,no-resolve",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "GEOIP,telegram,no-resolve",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "GEOSITE,microsoft",
      "Ⓜ️ 微软服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-ai-process",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-software",
      "🖥️ 软件分流 [自选]",
      true
    ],
    [
      "NETWORK,UDP",
      "🚀 默认代理 [自选]"
    ],
    [
      "NETWORK,UDP",
      "REJECT"
    ],
    [
      "MATCH",
      "🚀 默认代理 [自选]"
    ]
  ]
};
const OWNED_GROUPS = new Set(Object.values(POLICY.group));
const unique = (items) => [...new Set(items.filter(Boolean))];
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const VERIFIED_NODE = /\[海外\]/;
const BLOCKED_TYPES = "Pass|Compatible|Dns|Reject|RejectDrop";
const NON_PROXY_TYPES = new Set(["direct", ...BLOCKED_TYPES.toLowerCase().split("|")]);

const METADATA_FILTER = "(?i)(?:^|[|｜]|\\[海外\\])[^A-Za-z0-9\\u3400-\\u9FFF]*(?:官网(?:地址|网址)?|官方(?:网站|网址|频道|群组|交流群)?|流量(?:剩余|已用|总量|重置)?|剩余(?:流量)?|可用流量|已用流量|总流量|到期(?:时间|日期)?|过期(?:时间|日期)?|有效期|套餐(?:信息|名称|到期)?|订阅(?:信息|地址|链接|更新)?|(?:下次)?重置(?:时间|日期)?|traffic|remaining(?:[ _-]+traffic)?|expire[sd]?|expiry|quota|bandwidth|subscription|reset|official(?:[ _-]+(?:website|site|channel))?|website)(?=$|[\\s:：=|｜0-9-])";
const METADATA_RE = new RegExp(METADATA_FILTER.replace(/^\(\?i\)/, ""), "i");
const NODE_FILTER = "(?i)^(?!.*(?:" + METADATA_FILTER.slice(4) + ")).*" + VERIFIED_NODE.source;

const LEGACY_GROUPS = new Set([
  "直连(DIRECT)",
  "禁止广告(REJECT)",
  "🌐 全部节点 [系统]",
  "🌍 其他地区 [系统]",
  "🇺🇸 美国节点 [系统]",
  "🇲🇾 马来西亚节点 [系统]",
  "🇭🇰 香港节点 [系统]",
  "🇯🇵 日本节点 [系统]",
  "🇸🇬 新加坡节点 [系统]",
  "🇩🇪 德国节点 [系统]",
  "🛡️ 故障转移 [系统]",
  "⚖️ 负载均衡 [系统]",
  "🛰️ next-rules 规则下载 [系统]"
]);

function ownedGroupBase(name) {
  if (typeof name !== "string") return null;
  for (const base of OWNED_GROUPS) {
    const alias = base + " · Next-Rules";
    if (name === base || name === alias) return base;
    if (name.startsWith(alias + " ") && /^(?:[2-9]|[1-9][0-9]+)$/.test(name.slice(alias.length + 1))) return base;
  }
  return null;
}

const managedGroupName = (name) => ownedGroupBase(name) !== null || LEGACY_GROUPS.has(name);

function retainSubscriptionGroups(config, providers) {
  const existing = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const managed = new Map(existing
    .filter((group) => group && managedGroupName(group.name))
    .map((group) => [group.name, group]));
  const managedNames = [...managed.keys()].sort((a, b) => b.length - a.length);
  const required = new Set();
  const visited = new WeakSet();

  // 原订阅的链式节点、DNS 出口或其他策略组依赖的已有组保持原样。
  const inspect = (value) => {
    if (typeof value === "string") {
      let decoded = value;
      try { decoded = decodeURIComponent(value); } catch (_) { /* 非 URL 编码字符串按原文检查。 */ }
      for (const text of [value, decoded]) {
        let remaining = text;
        // 优先识别完整长名称，避免把带后缀的组误认为另一个同名前缀组。
        for (const name of managedNames) {
          if (remaining.includes(name)) {
            required.add(name);
            remaining = remaining.split(name).join("\0");
          }
        }
      }
    } else if (value && typeof value === "object" && !visited.has(value)) {
      visited.add(value);
      for (const child of Object.values(value)) inspect(child);
    }
  };

  inspect(existing.filter((group) => group && !managedGroupName(group.name)));
  for (const [key, value] of Object.entries(config)) {
    if (!["proxy-groups", "rules", "rule-providers"].includes(key)) inspect(value);
  }
  inspect(providers);
  // 多级依赖一并保留，避免更新后出现找不到策略组或链式连接循环的错误。
  for (const name of required) inspect(managed.get(name));

  return existing.filter((group) => (
    group && (!managedGroupName(group.name) || required.has(group.name))
  ));
}

function allocateGroupNames(config, retainedGroups) {
  const rawNodes = Array.isArray(config.proxies) ? config.proxies : [];
  const occupied = new Set([
    ...rawNodes.filter(Boolean).map((proxy) => proxy.name),
    ...Object.keys(asRecord(config["proxy-providers"])),
    ...retainedGroups.map((group) => group.name)
  ]);
  const names = new Map();
  // 原节点和提供者不改名；仅在重名时为新策略组添加项目后缀。
  for (const base of OWNED_GROUPS) {
    let name = base;
    let suffix = 1;
    while (occupied.has(name)) {
      name = base + " · Next-Rules" + (suffix === 1 ? "" : " " + suffix);
      suffix += 1;
    }
    occupied.add(name);
    names.set(base, name);
  }
  return names;
}

function cachePathKey(path) {
  if (typeof path !== "string") return "";
  const parts = [];
  for (const part of path.replace(/\\/g, "/").toLowerCase().split("/")) {
    if (!part || part === ".") continue;
    if (part === ".." && parts.length && parts[parts.length - 1] !== "..") parts.pop();
    else parts.push(part === ".." ? part : part.replace(/[. ]+$/, ""));
  }
  return parts.join("/");
}

function sameProvider(existing, expected) {
  return existing && Object.keys(existing).length === Object.keys(expected).length &&
    Object.entries(expected).every(([key, value]) => {
      if (!Array.isArray(value)) return existing[key] === value;
      const actual = existing[key];
      return Array.isArray(actual) && actual.length === value.length &&
        value.every((item, index) => item === actual[index]);
    });
}

function ruleProviderRegistry(config) {
  const providers = { ...(asRecord(config["rule-providers"])) };
  const occupiedNames = new Map(Object.keys(providers).map((name) => [name.toLowerCase(), name]));
  const paths = [
    ...Object.entries(providers).map(([name, provider]) => [name, cachePathKey(provider && provider.path)]),
    ...Object.values(asRecord(config["proxy-providers"])).map((provider) => [null, cachePathKey(provider && provider.path)])
  ];
  const names = new Map();

  // 原订阅可在 DNS、子规则等位置引用这些规则集。发生冲突时只更改新规则集的名称和缓存路径。
  const add = (base, definition) => {
    for (let suffix = 1; ; suffix += 1) {
      const name = suffix === 1 ? base : base + "-" + suffix;
      const desired = providerDefinition(name, definition);
      const occupied = occupiedNames.get(name);
      if (occupied && (occupied !== name || !sameProvider(providers[occupied], desired))) continue;
      const cachePath = cachePathKey(desired.path);
      // 本地脚本无法得知内核工作目录，绝对路径使用相同后缀时也保留原缓存。
      if (cachePath && paths.some(([owner, used]) =>
        owner !== name && (used === cachePath || used.endsWith("/" + cachePath))
      )) continue;
      if (!occupied) {
        providers[name] = desired;
        occupiedNames.set(name, name);
        if (cachePath) paths.push([name, cachePath]);
      }
      names.set(base, name);
      return;
    }
  };
  return { providers, names, add };
}

function providerDefinition(name, definition) {
  if (definition.type === "http") {
    return { ...definition, path: "./providers/" + name + "." + definition.format };
  }
  return { ...definition, payload: [...definition.payload] };
}

function buildGroups(groupNames, inlineNodes, providerNames = []) {
  const g = POLICY.group;
  const nameOf = (name) => groupNames.get(name) || name;
  const auto = nameOf(g.auto);
  const source = {
    filter: NODE_FILTER,
    "exclude-filter": METADATA_FILTER
  };
  // 远程入口从面板订阅读取节点。本地入口筛选内嵌节点，并沿用原来的节点提供者。
  if (inlineNodes === undefined) source["include-all"] = true;
  if (providerNames.length) source.use = providerNames;

  function selector(base, manualDirect) {
    return {
      name: nameOf(base),
      type: "select",
      "default-selected": auto,
      "empty-fallback": "REJECT",
      ...source,
      "exclude-type": manualDirect ? BLOCKED_TYPES : "Direct|" + BLOCKED_TYPES,
      proxies: unique([auto, ...(manualDirect ? ["DIRECT"] : []), ...(inlineNodes || [])])
    };
  }

  const autoGroup = {
    name: auto,
    type: "url-test",
    "empty-fallback": "REJECT",
    ...source,
    "exclude-type": "Direct|" + BLOCKED_TYPES,
    url: "https://cp.cloudflare.com/generate_204",
    interval: 300,
    tolerance: 50,
    lazy: true
  };
  if (inlineNodes !== undefined && (inlineNodes.length || !providerNames.length)) {
    autoGroup.proxies = inlineNodes.length ? inlineNodes : ["REJECT"];
  }

  return [
    selector(g.default, false),
    ...[g.ai, g.google, g.media, g.telegram, g.microsoft, g.apple, g.crypto, g.software]
      .map((base) => selector(base, true)),
    autoGroup,
    { name: nameOf(g.ads), type: "select", proxies: ["REJECT", "DIRECT"] }
  ];
}

function renderRules(providerNames, groupNames) {
  function tokens(condition) {
    const fields = condition.split(",");
    if (fields[0] === "RULE-SET") fields[1] = providerNames.get(fields[1]) || fields[1];
    return fields;
  }

  function and(conditions, target) {
    return "AND,(" + conditions.map((condition) => "(" + tokens(condition).join(",") + ")").join(",") + ")," + target;
  }

  const result = [];
  for (const [condition, base, guard] of POLICY.routes) {
    const target = groupNames.get(base) || base;
    if (Array.isArray(condition)) {
      result.push(and(condition, target));
    } else {
      const fields = tokens(condition);
      fields.splice(Math.min(fields.length, 2), 0, target);
      result.push(fields.join(","));
    }
    // 节点不支持 UDP 时内核会继续匹配，因此在同一条件下拒绝该请求。
    if (guard) result.push(and(unique(["NETWORK,UDP", ...[].concat(condition)]), "REJECT"));
  }
  return result;
}

function remoteFragment() {
  const groupNames = new Map();
  const providers = Object.fromEntries(Object.entries(POLICY.providers).map(([name, definition]) => [
    name, providerDefinition(name, definition)
  ]));
  return {
    "rule-providers": providers,
    "proxy-groups": buildGroups(groupNames),
    rules: renderRules(new Map(), groupNames)
  };
}

function main(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  const inlineNodes = Array.isArray(config.proxies)
    ? config.proxies.filter((node) => (
      node && typeof node.name === "string" &&
      VERIFIED_NODE.test(node.name) && !METADATA_RE.test(node.name) &&
      !NON_PROXY_TYPES.has(String(node.type || "").toLowerCase())
    )).map((node) => node.name)
    : [];
  const providerNames = Object.keys(asRecord(config["proxy-providers"]));
  const { providers, names: ruleProviderNames, add } = ruleProviderRegistry(config);
  for (const [name, definition] of Object.entries(POLICY.providers)) add(name, definition);

  const retained = retainSubscriptionGroups(config, providers);
  const groupNames = allocateGroupNames(config, retained);
  config["proxy-groups"] = [...buildGroups(groupNames, inlineNodes, providerNames), ...retained];
  config["rule-providers"] = providers;
  config.rules = renderRules(ruleProviderNames, groupNames);
  return config;
}
