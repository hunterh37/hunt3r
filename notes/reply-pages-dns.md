Namecheap DNS for GitHub Pages (repo hunterh37/hunt3r)

Namecheap: Domain List > Manage > Advanced DNS. Delete the default parking CNAME and URL Redirect records for @ and www. Add:

| Type  | Host | Value                |
|-------|------|----------------------|
| A     | @    | 185.199.108.153      |
| A     | @    | 185.199.109.153      |
| A     | @    | 185.199.110.153      |
| A     | @    | 185.199.111.153      |
| AAAA  | @    | 2606:50c0:8000::153  |
| AAAA  | @    | 2606:50c0:8001::153  |
| AAAA  | @    | 2606:50c0:8002::153  |
| AAAA  | @    | 2606:50c0:8003::153  |
| CNAME | www  | hunterh37.github.io. |

TTL Automatic. Nameservers must be "Namecheap BasicDNS".

GitHub side, with the domain in place of example.com:

    gh api -X PUT repos/hunterh37/hunt3r/pages -f cname=example.com
    gh api -X PUT repos/hunterh37/hunt3r/pages -F https_enforced=true   # after the cert issues

The workflow deploy (build_type=workflow) ignores a CNAME file in the repo; the API call or Settings > Pages > Custom domain sets it. Optional domain verification against takeover: GitHub Settings > Pages (account level) > Add a domain, then a TXT record `_github-pages-challenge-hunterh37` with the given value.

Check propagation: `dig +short example.com` returns the four 185.199.x.153 addresses. Cert issue takes up to 1 hour after DNS resolves.

vite.config.js uses `base: './'`, so the site works at both the domain root and /hunt3r/ without changes.

Namecheap MCP call failed: "Parameter ClientIP is invalid" (API whitelist IP mismatch), so the domain in the account was not read.
