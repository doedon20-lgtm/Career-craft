export default async function handler(req, res) {

const keyword =
    String(req.query.keyword || "").trim();

const location =
    String(req.query.location || "").trim();

const country =
    String(req.query.country || "").trim();


if(!keyword && !location && !country){

    return res.status(400).json({
        error:
            "Please enter a job title, skill, location or country."
    });

}


/*
------------------------------------------------
COUNTRY NORMALIZATION
------------------------------------------------
*/

const countryAliases = {

    usa: "United States",
    us: "United States",
    america: "United States",
    "united states": "United States",

    uk: "United Kingdom",
    britain: "United Kingdom",
    england: "United Kingdom",
    "great britain": "United Kingdom",
    "united kingdom": "United Kingdom",

    nigeria: "Nigeria",

    canada: "Canada",

    australia: "Australia",

    germany: "Germany",

    france: "France",

    spain: "Spain",

    italy: "Italy",

    netherlands: "Netherlands",

    ireland: "Ireland",

    "south africa": "South Africa",

    india: "India",

    singapore: "Singapore",

    "new zealand": "New Zealand",

    brazil: "Brazil",

    mexico: "Mexico",

    japan: "Japan",

    china: "China",

    "south korea": "South Korea",

    sweden: "Sweden",

    norway: "Norway",

    denmark: "Denmark",

    switzerland: "Switzerland",

    portugal: "Portugal",

    poland: "Poland",

    belgium: "Belgium",

    austria: "Austria",

    finland: "Finland",

    "united arab emirates": "United Arab Emirates",
    uae: "United Arab Emirates"

};


function normalizeCountry(value){

    const cleaned =
        String(value || "")
            .trim()
            .toLowerCase();

    if(!cleaned){

        return "";

    }

    return (
        countryAliases[cleaned] ||
        String(value).trim()
    );

}


/*
------------------------------------------------
DETERMINE COUNTRY
------------------------------------------------
*/

let selectedCountry =
    normalizeCountry(country);


/*
   If the user typed the country in the
   location box, detect it automatically.
*/

if(!selectedCountry && location){

    selectedCountry =
        normalizeCountry(location);

}


/*
------------------------------------------------
SEARCH ALL PROVIDERS
------------------------------------------------
*/

const searches = await Promise.allSettled([

    getAdzunaJobs(
        keyword,
        location,
        selectedCountry
    ),

    getHimalayasJobs(
        keyword,
        location,
        selectedCountry
    ),

    getJobicyJobs(
        keyword,
        location,
        selectedCountry
    )

]);


let results = [];

let providers = {
    adzuna: 0,
    himalayas: 0,
    jobicy: 0
};


searches.forEach(function(result, index){

    if(
        result.status !== "fulfilled" ||
        !Array.isArray(result.value)
    ){

        return;

    }


    const jobs =
        result.value;


    if(index === 0){

        providers.adzuna =
            jobs.length;

    }

    if(index === 1){

        providers.himalayas =
            jobs.length;

    }

    if(index === 2){

        providers.jobicy =
            jobs.length;

    }


    results.push(
        ...jobs
    );

});


/*
------------------------------------------------
REMOVE DUPLICATES
------------------------------------------------
*/

const seen =
    new Set();


results =
    results.filter(function(job){

        const id =
            job.id ||
            job.redirect_url ||
            job.url ||
            (
                String(job.title || "") +
                "|" +
                String(
                    job.company?.name ||
                    job.company?.display_name ||
                    job.company_name ||
                    ""
                )
            );


        if(seen.has(id)){

            return false;

        }


        seen.add(id);

        return true;

    });


/*
------------------------------------------------
SORT NEWEST FIRST
------------------------------------------------
*/

results.sort(function(a,b){

    const dateA =
        new Date(
            a.created ||
            a.date ||
            0
        ).getTime();


    const dateB =
        new Date(
            b.created ||
            b.date ||
            0
        ).getTime();


    return dateB - dateA;

});


/*
------------------------------------------------
RETURN RESULTS
------------------------------------------------
*/

return res.status(200).json({

    results:
        results.slice(0,100),

    count:
        results.length,

    country:
        selectedCountry || null,

    providers

});

}

/*

ADZUNA

*/

async function getAdzunaJobs(
keyword,
location,
country
){

/*
   Adzuna is currently being used for UK jobs.
*/

const appId =
    process.env.ADZUNA_APP_ID;

const appKey =
    process.env.ADZUNA_APP_KEY;


if(!appId || !appKey){

    return [];

}


const normalizedCountry =
    String(country || "")
        .toLowerCase();


/*
   Only use Adzuna when the search is
   intended for the UK.

   If no country was supplied, we can
   still search UK because this is our
   existing Adzuna source.
*/

const isUK =
    !normalizedCountry ||
    normalizedCountry === "united kingdom" ||
    normalizedCountry === "uk";


if(!isUK){

    return [];

}


const params =
    new URLSearchParams({

        app_id:
            appId,

        app_key:
            appKey,

        results_per_page:
            "20",

        what:
            keyword || "jobs",

        where:
            location ||
            "United Kingdom",

        "content-type":
            "application/json"

    });


const url =
    "https://api.adzuna.com/v1/api/jobs/gb/search/1?" +
    params.toString();


try{

    const response =
        await fetch(url);


    if(!response.ok){

        console.error(
            "Adzuna HTTP",
            response.status
        );

        return [];

    }


    const data =
        await response.json();


    if(
        !data ||
        !Array.isArray(data.results)
    ){

        return [];

    }


    return data.results.map(function(job){

        return {

            id:
                "adzuna-" +
                String(job.id || ""),

            title:
                job.title ||
                "Untitled Job",

            company: {

                name:
                    job.company?.display_name ||
                    job.company?.name ||
                    ""

            },

            company_name:
                job.company?.display_name ||
                job.company?.name ||
                "",

            location: {

                display_name:
                    job.location?.display_name ||
                    "United Kingdom"

            },

            description:
                job.description ||
                "",

            contract_time:
                job.contract_time ||
                "",

            salary_min:
                job.salary_min ||
                null,

            salary_max:
                job.salary_max ||
                null,

            salary_currency:
                "GBP",

            redirect_url:
                job.redirect_url ||
                "",

            created:
                job.created ||
                "",

            source:
                "Adzuna"

        };

    });


}catch(error){

    console.error(
        "Adzuna error:",
        error
    );

    return [];

}

}

/*

HIMALAYAS

*/

async function getHimalayasJobs(
keyword,
location,
country
){

try{

    const params =
        new URLSearchParams({

            q:
                keyword || "",

            page:
                "1",

            limit:
                "20"

        });


    /*
       Himalayas supports country filtering.
    */

    if(country){

        params.set(
            "country",
            country
        );

    }


    /*
       If no country is supplied, don't
       artificially restrict the search.
    */


    const url =
        "https://himalayas.app/jobs/api/search?" +
        params.toString();


    const response =
        await fetch(url);


    if(!response.ok){

        console.error(
            "Himalayas HTTP",
            response.status
        );

        return [];

    }


    const data =
        await response.json();


    const jobs =
        Array.isArray(data)
            ? data
            : Array.isArray(data.jobs)
                ? data.jobs
                : [];


    return jobs.map(function(job){

        const companyName =
            job.company?.name ||
            job.company_name ||
            job.company ||
            job.employer ||
            "";


        const jobLocation =
            job.location ||
            job.country ||
            job.location_name ||
            "Remote";


        return {

            id:
                "himalayas-" +
                String(
                    job.id ||
                    job.slug ||
                    Math.random()
                ),

            title:
                job.title ||
                "Untitled Job",

            company: {

                name:
                    companyName

            },

            company_name:
                companyName,

            location: {

                display_name:
                    jobLocation

            },

            description:
                job.description ||
                "",

            contract_time:
                job.employmentType ||
                job.employment_type ||
                job.type ||
                "",

            salary_min:
                job.minSalary ||
                job.salary_min ||
                null,

            salary_max:
                job.maxSalary ||
                job.salary_max ||
                null,

            salary_currency:
                job.currency ||
                "",

            redirect_url:
                job.applicationLink ||
                job.application_url ||
                job.url ||
                job.link ||
                "",

            created:
                job.pubDate ||
                job.created ||
                job.date ||
                "",

            source:
                "Himalayas"

        };

    });


}catch(error){

    console.error(
        "Himalayas error:",
        error
    );

    return [];

}

}

/*

JOBICY

*/

async function getJobicyJobs(
keyword,
location,
country
){

try{

    const params =
        new URLSearchParams({

            count:
                "50"

        });


    if(keyword){

        params.set(
            "tag",
            keyword
        );

    }


    /*
       Jobicy uses geo for geographical
       targeting.

       When a country is selected, send
       that country.

       When no country is selected,
       leave it open for worldwide remote jobs.
    */

    if(country){

        params.set(
            "geo",
            country
        );

    }


    const url =
        "https://jobicy.com/api/v2/remote-jobs?" +
        params.toString();


    const response =
        await fetch(url);


    if(!response.ok){

        console.error(
            "Jobicy HTTP",
            response.status
        );

        return [];

    }


    const data =
        await response.json();


    const jobs =
        Array.isArray(data)
            ? data
            : Array.isArray(data.jobs)
                ? data.jobs
                : [];


    return jobs.map(function(job){

        const companyName =
            job.companyName ||
            job.company_name ||
            job.company?.name ||
            job.company?.display_name ||
            job.employer ||
            "";


        const jobLocation =
            job.jobGeo ||
            job.geo ||
            job.location ||
            job.country ||
            "Remote";


        return {

            id:
                "jobicy-" +
                String(
                    job.id ||
                    job.jobId ||
                    job.slug ||
                    Math.random()
                ),

            title:
                job.jobTitle ||
                job.title ||
                "Untitled Job",

            company: {

                name:
                    companyName

            },

            company_name:
                companyName,

            location: {

                display_name:
                    jobLocation

            },

            description:
                job.jobDescription ||
                job.description ||
                "",

            contract_time:
                job.jobType ||
                job.type ||
                "",

            salary_min:
                job.salaryMin ||
                null,

            salary_max:
                job.salaryMax ||
                null,

            salary_currency:
                job.salaryCurrency ||
                "",

            redirect_url:
                job.url ||
                job.applyUrl ||
                job.applicationUrl ||
                "",

            created:
                job.pubDate ||
                job.date ||
                job.created ||
                "",

            source:
                "Jobicy"

        };

    });


}catch(error){

    console.error(
        "Jobicy error:",
        error
    );

    return [];

}

                    }
