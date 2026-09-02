export default async function handler(req, res) {

    /*
     * CareerCraft Worldwide Job API
     *
     * Sources:
     * 1. Adzuna       → UK jobs
     * 2. Himalayas    → Worldwide remote jobs
     * 3. Jobicy       → Worldwide remote jobs
     *
     * Adzuna still uses:
     * ADZUNA_APP_ID
     * ADZUNA_APP_KEY
     */

    const keyword =
        (req.query.keyword || "").trim();

    const location =
        (req.query.location || "").trim();

    const country =
        (req.query.country || "").trim();


    /*
     * Don't allow completely empty searches.
     */

    if (!keyword && !location && !country) {

        return res.status(400).json({

            error:
                "Please enter a job title, skill, country or location."

        });

    }


    /*
     * Search values
     */

    const searchKeyword =
        keyword || "jobs";

    const searchLocation =
        location || country || "";


    /*
     * Run the job providers independently.
     *
     * If one provider fails, the others can
     * still return jobs.
     */

    const results = await Promise.allSettled([

        getAdzunaJobs(
            searchKeyword,
            searchLocation,
            country
        ),

        getHimalayasJobs(
            searchKeyword,
            searchLocation,
            country
        ),

        getJobicyJobs(
            searchKeyword,
            searchLocation,
            country
        )

    ]);


    /*
     * Collect successful results.
     */

    let jobs = [];

    let providerStatus = {};


    /*
     * Adzuna
     */

    if (results[0].status === "fulfilled") {

        const adzunaResults =
            results[0].value || [];

        jobs.push(
            ...adzunaResults
        );

        providerStatus.adzuna =
            "ok";

    } else {

        console.error(
            "Adzuna provider failed:",
            results[0].reason
        );

        providerStatus.adzuna =
            "error";

    }


    /*
     * Himalayas
     */

    if (results[1].status === "fulfilled") {

        const himalayasResults =
            results[1].value || [];

        jobs.push(
            ...himalayasResults
        );

        providerStatus.himalayas =
            "ok";

    } else {

        console.error(
            "Himalayas provider failed:",
            results[1].reason
        );

        providerStatus.himalayas =
            "error";

    }


    /*
     * Jobicy
     */

    if (results[2].status === "fulfilled") {

        const jobicyResults =
            results[2].value || [];

        jobs.push(
            ...jobicyResults
        );

        providerStatus.jobicy =
            "ok";

    } else {

        console.error(
            "Jobicy provider failed:",
            results[2].reason
        );

        providerStatus.jobicy =
            "error";

    }


    /*
     * Remove duplicate jobs.
     */

    jobs =
        removeDuplicates(jobs);


    /*
     * Sort newest jobs first when dates
     * are available.
     */

    jobs.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.created || 0
                ).getTime();

            const dateB =
                new Date(
                    b.created || 0
                ).getTime();

            return dateB - dateA;

        }
    );


    /*
     * Limit the response.
     */

    jobs =
        jobs.slice(0, 100);


    /*
     * Return unified response.
     */

    return res.status(200).json({

        results:
            jobs,

        count:
            jobs.length,

        providers:
            providerStatus

    });

}


/* =========================================================
   ADZUNA
========================================================= */

async function getAdzunaJobs(
    keyword,
    location,
    country
) {

    /*
     * Adzuna implementation is intentionally UK-only.
     */

    const appId =
        process.env.ADZUNA_APP_ID;

    const appKey =
        process.env.ADZUNA_APP_KEY;


    /*
     * If credentials aren't available,
     * simply skip Adzuna.
     */

    if (!appId || !appKey) {

        console.warn(
            "Adzuna credentials are missing."
        );

        return [];

    }


    /*
     * Only use Adzuna when the user is
     * searching the UK or has not selected
     * another country.
     */

    const requestedCountry =
        country.toLowerCase();


    const locationLower =
        location.toLowerCase();


    const isUK =
        requestedCountry === "uk" ||
        requestedCountry === "united kingdom" ||
        requestedCountry === "gb" ||
        requestedCountry === "great britain" ||
        requestedCountry === "england" ||
        requestedCountry === "";


    /*
     * If another country is specifically selected,
     * don't send that search to the UK endpoint.
     */

    if (
        !isUK &&
        requestedCountry !== ""
    ) {

        return [];

    }


    const params =
        new URLSearchParams({

            app_id:
                appId,

            app_key:
                appKey,

            results_per_page:
                "30",

            what:
                keyword || "jobs",

            where:
                location || "United Kingdom",

            "content-type":
                "application/json"

        });


    const url =
        `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params.toString()}`;


    const response =
        await fetch(url);


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `Adzuna HTTP ${response.status}: ${text.substring(0,300)}`
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data.results)) {

        return [];

    }


    return data.results.map(
        job => ({

            id:
                `adzuna-${job.id}`,

            title:
                job.title || "Job",

            company:
                job.company?.display_name ||
                "Company",

            location:
                job.location?.display_name ||
                "United Kingdom",

            description:
                stripHTML(
                    job.description || ""
                ),

            salary:
                formatSalary(
                    job.salary_min,
                    job.salary_max,
                    job.salary_is_predicted
                ),

            created:
                job.created ||
                "",

            url:
                job.redirect_url ||
                "#",

            source:
                "Adzuna",

            country:
                "United Kingdom",

            remote:
                false

        })
    );

}


/* =========================================================
   HIMALAYAS
========================================================= */

async function getHimalayasJobs(
    keyword,
    location,
    country
) {

    /*
     * Himalayas is a public API.
     *
     * No API key is required.
     */

    const params =
        new URLSearchParams();


    if(keyword){

        params.set(
            "q",
            keyword
        );

    }


    /*
     * Himalayas supports country filtering.
     * Only add it when the user actually
     * selected a country.
     */

    if(country){

        params.set(
            "country",
            country
        );

    }


    params.set(
        "page",
        "1"
    );


    params.set(
        "limit",
        "50"
    );


    const url =
        `https://himalayas.app/jobs/api/search?${params.toString()}`;


    const response =
        await fetch(url, {

            headers: {

                "Accept":
                    "application/json"

            }

        });


    if(!response.ok){

        const text =
            await response.text();

        throw new Error(
            `Himalayas HTTP ${response.status}: ${text.substring(0,300)}`
        );

    }


    const data =
        await response.json();


    /*
     * Different API versions can expose
     * the jobs array under different names.
     */

    const list =
        Array.isArray(data.jobs)
            ? data.jobs
            : Array.isArray(data.results)
                ? data.results
                : [];


    return list.map(
        job => ({

            id:
                `himalayas-${job.id || job.slug || Math.random()}`,

            title:
                job.title ||
                job.position ||
                "Remote Job",

            company:
                job.companyName ||
                job.company ||
                "Company",

            location:
                job.location ||
                job.locationName ||
                "Worldwide",

            description:
                stripHTML(
                    job.description ||
                    job.excerpt ||
                    ""
                ),

            salary:
                formatHimalayasSalary(
                    job
                ),

            created:
                job.createdAt ||
                job.publishedAt ||
                job.created ||
                "",

            url:
                job.applicationLink ||
                job.url ||
                job.link ||
                "#",

            source:
                "Himalayas",

            country:
                country ||
                "Worldwide",

            remote:
                true

        })
    );

}


/* =========================================================
   JOBICY
========================================================= */

async function getJobicyJobs(
    keyword,
    location,
    country
) {

    /*
     * Jobicy public API.
     *
     * No API key required.
     */

    const params =
        new URLSearchParams();


    if(keyword){

        params.set(
            "tag",
            keyword
        );

    }


    /*
     * Jobicy uses geo for location/country
     * filtering.
     */

    if(country){

        params.set(
            "geo",
            country
        );

    }


    const url =
        `https://jobicy.com/api/v2/remote-jobs?${params.toString()}`;


    const response =
        await fetch(url);


    if(!response.ok){

        const text =
            await response.text();

        throw new Error(
            `Jobicy HTTP ${response.status}: ${text.substring(0,300)}`
        );

    }


    const data =
        await response.json();


    const list =
        Array.isArray(data.jobs)
            ? data.jobs
            : [];


    return list.map(
        job => ({

            id:
                `jobicy-${job.id || Math.random()}`,

            title:
                job.jobTitle ||
                job.title ||
                "Remote Job",

            company:
                job.companyName ||
                job.company ||
                "Company",

            location:
                job.jobGeo ||
                job.location ||
                "Worldwide",

            description:
                stripHTML(
                    job.jobDescription ||
                    job.description ||
                    ""
                ),

            salary:
                job.annualSalary ||
                job.salary ||
                "Salary not specified",

            created:
                job.pubDate ||
                job.created ||
                "",

            url:
                job.url ||
                job.jobUrl ||
                "#",

            source:
                "Jobicy",

            country:
                country ||
                "Worldwide",

            remote:
                true

        })
    );

}


/* =========================================================
   DUPLICATE REMOVAL
========================================================= */

function removeDuplicates(jobs){

    const seen =
        new Set();

    return jobs.filter(
        job => {

            const key =
                (
                    job.title +
                    "|" +
                    job.company +
                    "|" +
                    job.location
                )
                .toLowerCase()
                .replace(/\s+/g," ")
                .trim();


            if(seen.has(key)){

                return false;

            }


            seen.add(key);

            return true;

        }
    );

}


/* =========================================================
   HTML CLEANER
========================================================= */

function stripHTML(value){

    if(!value)
        return "";

    return String(value)
        .replace(/<[^>]*>/g," ")
        .replace(/&nbsp;/gi," ")
        .replace(/&amp;/gi,"&")
        .replace(/&quot;/gi,'"')
        .replace(/&#39;/gi,"'")
        .replace(/\s+/g," ")
        .trim();

}


/* =========================================================
   SALARY FORMATTER
========================================================= */

function formatSalary(
    minimum,
    maximum,
    predicted
){

    if(
        !minimum &&
        !maximum
    ){

        return "Salary not specified";

    }


    if(
        minimum &&
        maximum
    ){

        return `£${Number(minimum).toLocaleString()} - £${Number(maximum).toLocaleString()}${predicted ? " (estimated)" : ""}`;

    }


    if(minimum){

        return `From £${Number(minimum).toLocaleString()}${predicted ? " (estimated)" : ""}`;

    }


    if(maximum){

        return `Up to £${Number(maximum).toLocaleString()}${predicted ? " (estimated)" : ""}`;

    }


    return "Salary not specified";

}


/* =========================================================
   HIMALAYAS SALARY
========================================================= */

function formatHimalayasSalary(job){

    if(
        job.salary
    ){

        if(
            typeof job.salary === "string"
        ){

            return job.salary;

        }

        if(
            typeof job.salary === "object"
        ){

            const min =
                job.salary.min ||
                job.salary.minimum;

            const max =
                job.salary.max ||
                job.salary.maximum;

            const currency =
                job.salary.currency ||
                "";

            if(min && max){

                return `${currency} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;

            }

            if(min){

                return `${currency} ${Number(min).toLocaleString()}`;

            }

            if(max){

                return `${currency} ${Number(max).toLocaleString()}`;

            }

        }

    }


    return "Salary not specified";

                }
