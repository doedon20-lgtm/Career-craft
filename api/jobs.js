export default async function handler(req, res) {

    const keyword =
        (req.query.keyword || "").trim();

    const location =
        (req.query.location || "").trim();

    const appId =
        process.env.ADZUNA_APP_ID;

    const appKey =
        process.env.ADZUNA_APP_KEY;


    // Check Adzuna credentials
    if (!appId || !appKey) {

        return res.status(500).json({

            error:
                "Adzuna credentials are missing in Vercel."

        });

    }


    // Don't allow completely empty searches
    if (!keyword && !location) {

        return res.status(400).json({

            error:
                "Please enter a job title, skill or location."

        });

    }


    try {

        const params =
            new URLSearchParams({

                app_id: appId,

                app_key: appKey,

                results_per_page: "20",

                what:
                    keyword || "jobs",

                where:
                    location || "United Kingdom",

                "content-type":
                    "application/json"

            });


        const adzunaURL =
            `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params.toString()}`;


        const response =
            await fetch(adzunaURL);


        const text =
            await response.text();


        // Adzuna returned an error
        if (!response.ok) {

            console.error(
                "Adzuna error:",
                response.status,
                text
            );


            return res.status(response.status).json({

                error:
                    `Adzuna returned HTTP ${response.status}.`,

                details:
                    text.substring(0, 500)

            });

        }


        // Convert Adzuna response to JSON
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


        // Make sure the frontend always receives results
        if (!Array.isArray(data.results)) {

            data.results = [];

        }


        return res.status(200).json({

            results:
                data.results,

            count:
                data.count || data.results.length

        });

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
