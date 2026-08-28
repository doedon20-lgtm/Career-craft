export default async function handler(req, res) {

    const keyword =
        req.query.keyword || "software developer";

    const location =
        req.query.location || "London";

    const appId =
        process.env.ADZUNA_APP_ID;

    const appKey =
        process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {

        return res.status(500).json({
            error: "Adzuna credentials are missing in Vercel."
        });

    }

    try {

        const params = new URLSearchParams({

            app_id: appId,

            app_key: appKey,

            results_per_page: "20",

            what: keyword,

            where: location,

            "content-type": "application/json"

        });


        const adzunaURL =
            `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params.toString()}`;


        const response =
            await fetch(adzunaURL);


        const text =
            await response.text();


        if (!response.ok) {

            return res.status(response.status).json({

                error:
                    `Adzuna returned HTTP ${response.status}.`,

                details:
                    text.substring(0, 500)

            });

        }


        let data;

        try {

            data =
                JSON.parse(text);

        }

        catch {

            return res.status(502).json({

                error:
                    "Adzuna returned an invalid response."

            });

        }


        return res.status(200).json(data);

    }

    catch (error) {

        console.error(
            "Adzuna connection error:",
            error
        );

        return res.status(500).json({

            error:
                "Could not connect to Adzuna.",

            details:
                error.message

        });

    }

}
