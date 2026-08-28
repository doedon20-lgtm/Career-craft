export default async function handler(req, res) {

    const keyword =
        req.query.keyword || "software developer";

    const location =
        req.query.location || "uk";

    const appId =
        process.env.ADZUNA_APP_ID;

    const appKey =
        process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {

        return res.status(500).json({
            error: "Adzuna credentials are missing."
        });

    }

    try {

        const url =
            `https://api.adzuna.com/v1/api/jobs/gb/search/1` +
            `?app_id=${encodeURIComponent(appId)}` +
            `&app_key=${encodeURIComponent(appKey)}` +
            `&results_per_page=20` +
            `&what=${encodeURIComponent(keyword)}` +
            `&where=${encodeURIComponent(location)}` +
            `&content-type=application/json`;

        const response =
            await fetch(url);

        if (!response.ok) {

            return res.status(response.status).json({
                error: "Adzuna request failed."
            });

        }

        const data =
            await response.json();

        return res.status(200).json(data);

    } catch (error) {

        return res.status(500).json({
            error: "Unable to connect to Adzuna."
        });

    }

      }
