# cloudflare-worker-review-images

This cloudflare worker is used to forward google drive images to reviews.io.

We use a google service account to 

## technologies used
- [cloudflare workers](https://developers.cloudflare.com/workers/)
- [hono](https://hono.dev/)
- [pnpm](https://pnpm.io/)
- [volta](https://volta.sh/)

## run the project running

```bash
pnpm i
pnpm dev
```
## needed `.env` variables
- GOOGLE_JWT_PRIVATE_KEY
- GOOGLE_JWT_PRIVATE_KEY_ID
- GOOGLE_JWT_EMAIL

## deployment
We deploy each commit to cloudflare pages (https://dash.cloudflare.com/2f10dc1d109439e83c89b6c9e9ad51de/pages/view/review-images)

- main branch: staging instace
- production branch: production instace

⚠️ when adding the `GOOGLE_JWT_PRIVATE_KEY` to cloudflare pages, you need to do the following
1. remove the start and end of the signature marked by `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
2. remove all `\n`

## branches and urls
- production: review-img.woom.com
- staging: review-img-staging.woom.com
- feature: see cloudflare feature branch