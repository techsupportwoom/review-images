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
We deploy each commit to cloudflare pages

- main branch: staging instace
- production branch: production instace
