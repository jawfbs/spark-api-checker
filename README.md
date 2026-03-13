# Spark API Connection Checker

A minimal [Next.js](https://nextjs.org/) app deployed on [Vercel](https://vercel.com) that tests live connectivity to the **Spark API by FBS** (replication endpoint).

Press **Run** → get **Success** (pulling active data) or **Run Failed** (connection problem).

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USERNAME%2Fspark-api-checker&env=SPARK_ACCESS_TOKEN&envDescription=Your%20Spark%20API%20bearer%20token%20from%20FBS&envLink=http%3A%2F%2Fsparkplatform.com%2Fdocs%2Fauthentication%2Faccess_token&project-name=spark-api-checker&repository-name=spark-api-checker)

> Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username after creating the repo.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SPARK_API_BASE_URL` | No | `https://replication.sparkapi.com` | Spark replication endpoint |
| `SPARK_ACCESS_TOKEN` | **Yes** | — | Your bearer token from FBS |

## Tech Stack

- **Next.js 14** (App Router)
- **Vercel Edge Functions** (API route)
- **Spark API v1** — `/v1/listings`

## Documentation

- [Spark API – Access Token Auth](http://sparkplatform.com/docs/authentication/access_token)
- [Spark API – Developer Docs](http://sparkplatform.com/docs/api_services/read_first)
- [Spark API – Replication](http://sparkplatform.com/docs/api_services/replication)

## License

MIT
