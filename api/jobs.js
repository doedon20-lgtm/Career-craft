// CareerCraft Worldwide Jobs API
// File: api/jobs.js

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    const keyword = String(req.query.keyword || "").trim();
    const location = String(req.query.location || "").trim();
    const country = String(req.query.country || "").trim();

    if (!keyword && !location && !country) {
        return res.status(400).json({
            error: "Please enter a job title, skill, country or location."
        });
    }

    try {
        const results = await Promise.allSettled([
            getHimalayasJobs(keyword, location, country),
            getJobicyJobs(keyword, location, country),
            getAdzunaJobs(keyword, location, country)
        ]);

        let jobs = [];

        for (const result of results) {
            if (result.status === "fulfilled" && Array.isArray(result.value)) {
                jobs.push(...result.value);
            }
        }

        // Remove duplicates
        const seen = new Set();

        jobs = jobs.filter((job) => {
            const key = [
                job.title,
                job.company_name,
                job.location?.display_name,
                job.apply_url
            ]
                .join("|")
                .toLowerCase();

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });

        // Sort newest first
        jobs.sort((a, b) => {
            const dateA = new Date(a.created || 0).getTime();
            const dateB = new Date(b.created || 0).getTime();

            return dateB - dateA;
        });

        return res.status(200).json({
            results: jobs.slice(0, 100),
            count: jobs.length,
            search: {
                keyword,
                location,
                country
            },
            providers: {
                himalayas:
                    results[0].status === "fulfilled"
                        ? results[0].value.length
                        : 0,

                jobicy:
                    results[1].status === "fulfilled"
                        ? results[1].value.length
                        : 0,

                adzuna:
                    results[2].status === "fulfilled"
                        ? results[2].value.length
                        : 0
            }
        });

    } catch (error) {
        console.error("CareerCraft jobs error:", error);

        return res.status(500).json({
            error: "Unable to search jobs right now.",
            details: error.message
        });
    }
}


/* =========================================================
   COUNTRY HELPERS
========================================================= */

const COUNTRY_CODES = {
    "United States": "US",
    "United Kingdom": "GB",
    "Nigeria": "NG",
    "Canada": "CA",
    "Australia": "AU",
    "Germany": "DE",
    "France": "FR",
    "India": "IN",
    "South Africa": "ZA",
    "Ireland": "IE",
    "Netherlands": "NL",
    "Singapore": "SG",
    "New Zealand": "NZ",
    "Japan": "JP",
    "China": "CN",
    "South Korea": "KR",
    "Brazil": "BR",
    "Mexico": "MX",
    "Spain": "ES",
    "Italy": "IT",
    "Portugal": "PT",
    "Switzerland": "CH",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Finland": "FI",
    "Poland": "PL",
    "Belgium": "BE",
    "Austria": "AT",
    "Ghana": "GH",
    "Kenya": "KE",
    "Egypt": "EG",
    "United Arab Emirates": "AE",
    "Saudi Arabia": "SA",
    "Israel": "IL",
    "Turkey": "TR",
    "Pakistan": "PK",
    "Bangladesh": "BD",
    "Philippines": "PH",
    "Malaysia": "MY",
    "Indonesia": "ID",
    "Thailand": "TH",
    "Vietnam": "VN",
    "Ukraine": "UA",
    "Romania": "RO",
    "Czechia": "CZ",
    "Greece": "GR",
    "Hungary": "HU",
    "Iceland": "IS",
    "Luxembourg": "LU",
    "Estonia": "EE",
    "Latvia": "LV",
    "Lithuania": "LT",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Croatia": "HR",
    "Serbia": "RS",
    "Bulgaria": "BG",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",
    "Peru": "PE",
    "Uruguay": "UY",
    "Costa Rica": "CR",
    "Panama": "PA",
    "Morocco": "MA",
    "Nigeria": "NG",
    "Tunisia": "TN",
    "Uganda": "UG",
    "Tanzania": "TZ",
    "Rwanda": "RW",
    "Mauritius": "MU",
    "Zambia": "ZM",
    "Zimbabwe": "ZW"
};

const JOBICY_GEO = {
    "United States": "usa",
    "United Kingdom": "uk",
    "Canada": "canada",
    "Australia": "australia",
    "Germany": "germany",
    "France": "france",
    "India": "india",
    "South Africa": "south-africa",
    "Ireland": "ireland",
    "Netherlands": "netherlands",
    "Singapore": "singapore",
    "New Zealand": "new-zealand",
    "Japan": "japan",
    "China": "china",
    "Brazil": "brazil",
    "Mexico": "mexico",
    "Spain": "spain",
    "Italy": "italy",
    "Portugal": "portugal",
    "Switzerland": "switzerland",
    "Sweden": "sweden",
    "Norway": "norway",
    "Denmark": "denmark",
    "Finland": "finland",
    "Poland": "poland",
    "Belgium": "belgium",
    "Austria": "austria",
    "Ghana": "ghana",
    "Kenya": "kenya",
    "Egypt": "egypt",
    "United Arab Emirates": "uae",
    "Saudi Arabia": "saudi-arabia",
    "Israel": "israel",
    "Turkey": "turkey",
    "Pakistan": "pakistan",
    "Bangladesh": "bangladesh",
    "Philippines": "philippines",
    "Malaysia": "malaysia",
    "Indonesia": "indonesia",
    "Thailand": "thailand",
    "Vietnam": "vietnam",
    "Ukraine": "ukraine",
    "Romania": "romania",
    "Czechia": "czechia",
    "Greece": "greece",
    "Hungary": "hungary",
    "Argentina": "argentina",
    "Chile": "chile",
    "Colombia": "colombia",
    "Peru": "peru",
    "Morocco": "morocco",
    "Nigeria": "nigeria"
};

function countryCode(country) {
    return COUNTRY_CODES[country] || "";
}

function jobicyGeo(country) {
    return JOBICY_GEO[country] || "";
}


/* =========================================================
   HIMALAYAS
========================================================= */

async function getHimalayasJobs(keyword, location, country) {
    try {
        const params = new URLSearchParams();

        if (keyword) {
            params.set("q", keyword);
        }

        if (country && country !== "Worldwide") {
            const code = countryCode(country);

            if (code) {
                params.set("country", code);
            } else {
                params.set("country", country);
            }
        }

        params.set("page", "1");

        const url =
            "https://himalayas.app/jobs/api/search?" +
            params.toString();

        const response = await fetch(url, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            console.error(
                "Himalayas error:",
                response.status
            );

            return [];
        }

        const data = await response.json();

        const jobs = Array.isArray(data.jobs)
            ? data.jobs
            : [];

        return jobs
            .filter((job) => {
                if (!location) return true;

                const text = [
                    job.title,
                    job.companyName,
                    ...(job.locationRestrictions || [])
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(location.toLowerCase());
            })
            .map((job) => {
                let displayCountry = "";

                if (
                    Array.isArray(job.locationRestrictions) &&
                    job.locationRestrictions.length
                ) {
                    displayCountry =
                        job.locationRestrictions.join(", ");
                }

                if (!displayCountry) {
                    displayCountry =
                        country && country !== "Worldwide"
                            ? country
                            : "Worldwide";
                }

                const locationText =
                    displayCountry === "Worldwide"
                        ? "Remote / Worldwide"
                        : `Remote / ${displayCountry}`;

                return {
                    id: `himalayas-${job.guid || Math.random()}`,

                    title:
                        job.title ||
                        "Job opportunity",

                    company_name:
                        job.companyName ||
                        "Company not specified",

                    company: {
                        name:
                            job.companyName ||
                            "Company not specified",

                        logo:
                            job.companyLogo || ""
                    },

                    location: {
                        display_name: locationText
                    },

                    country: displayCountry,

                    description:
                        job.excerpt ||
                        stripHtml(job.description || ""),

                    salary: formatSalary(
                        job.minSalary,
                        job.maxSalary,
                        job.currency,
                        job.salaryPeriod
                    ),

                    job_type:
                        job.employmentType ||
                        "Remote",

                    created:
                        job.pubDate || "",

                    apply_url:
                        job.applicationLink ||
                        "https://himalayas.app/jobs",

                    source: "Himalayas",
                    source_url: "https://himalayas.app/"
                };
            });

    } catch (error) {
        console.error("Himalayas connection error:", error);
        return [];
    }
}


/* =========================================================
   JOBICY
========================================================= */

async function getJobicyJobs(keyword, location, country) {
    try {
        const params = new URLSearchParams();

        params.set("count", "100");

        if (keyword) {
            params.set("tag", keyword);
        }

        if (country && country !== "Worldwide") {
            const geo = jobicyGeo(country);

            if (geo) {
                params.set("geo", geo);
            }
        }

        const url =
            "https://jobicy.com/api/v2/remote-jobs?" +
            params.toString();

        const response = await fetch(url, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            console.error(
                "Jobicy error:",
                response.status
            );

            return [];
        }

        const data = await response.json();

        const jobs = Array.isArray(data.jobs)
            ? data.jobs
            : [];

        return jobs
            .filter((job) => {
                if (!location) return true;

                const text = [
                    job.jobTitle,
                    job.companyName,
                    job.jobGeo
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(location.toLowerCase());
            })
            .map((job) => {
                let displayCountry =
                    job.jobGeo ||
                    "";

                if (
                    country &&
                    country !== "Worldwide"
                ) {
                    displayCountry = country;
                }

                if (!displayCountry) {
                    displayCountry =
                        "Worldwide";
                }

                const locationText =
                    displayCountry === "Worldwide"
                        ? "Remote / Worldwide"
                        : `Remote / ${displayCountry}`;

                return {
                    id:
                        `jobicy-${job.id || Math.random()}`,

                    title:
                        job.jobTitle ||
                        "Job opportunity",

                    company_name:
                        job.companyName ||
                        "Company not specified",

                    company: {
                        name:
                            job.companyName ||
                            "Company not specified",

                        logo:
                            job.companyLogo || ""
                    },

                    location: {
                        display_name: locationText
                    },

                    country:
                        displayCountry,

                    description:
                        stripHtml(
                            job.jobExcerpt ||
                            job.jobDescription ||
                            ""
                        ),

                    salary:
                        formatSalary(
                            job.salaryMin,
                            job.salaryMax,
                            job.salaryCurrency,
                            "annual"
                        ),

                    job_type:
                        Array.isArray(job.jobType)
                            ? job.jobType.join(", ")
                            : job.jobType ||
                              "Remote",

                    created:
                        job.pubDate || "",

                    apply_url:
                        job.url ||
                        "https://jobicy.com/jobs",

                    source: "Jobicy",
                    source_url: "https://jobicy.com/"
                };
            });

    } catch (error) {
        console.error("Jobicy connection error:", error);
        return [];
    }
}


/* =========================================================
   ADZUNA - UK
========================================================= */

async function getAdzunaJobs(keyword, location, country) {
    // Adzuna is only used when the selected country is UK.
    if (
        country &&
        country !== "Worldwide" &&
        country !== "United Kingdom"
    ) {
        return [];
    }

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
        console.warn(
            "Adzuna credentials are missing."
        );

        return [];
    }

    try {
        const params = new URLSearchParams({
            app_id: appId,
            app_key: appKey,
            results_per_page: "20",
            what: keyword || "jobs",
            where:
                location ||
                (
                    country === "United Kingdom"
                        ? "United Kingdom"
                        : "United Kingdom"
                ),
            "content-type":
                "application/json"
        });

        const url =
            "https://api.adzuna.com/v1/api/jobs/gb/search/1?" +
            params.toString();

        const response = await fetch(url);

        const text = await response.text();

        if (!response.ok) {
            console.error(
                "Adzuna error:",
                response.status,
                text
            );

            return [];
        }

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            return [];
        }

        const jobs =
            Array.isArray(data.results)
                ? data.results
                : [];

        return jobs.map((job) => {
            const company =
                job.company &&
                job.company.display_name
                    ? job.company.display_name
                    : "Company not specified";

            const locationName =
                job.location &&
                job.location.display_name
                    ? job.location.display_name
                    : "United Kingdom";

            return {
                id:
                    `adzuna-${job.id || Math.random()}`,

                title:
                    job.title ||
                    "Job opportunity",

                company_name:
                    company,

                company: {
                    name: company,
                    logo: ""
                },

                location: {
                    display_name:
                        locationName
                },

                country:
                    "United Kingdom",

                description:
                    stripHtml(
                        job.description || ""
                    ),

                salary:
                    formatSalary(
                        job.salary_min,
                        job.salary_max,
                        "GBP",
                        "annual"
                    ),

                job_type:
                    job.contract_type ||
                    "Not specified",

                created:
                    job.created || "",

                apply_url:
                    job.redirect_url ||
                    "https://www.adzuna.co.uk/",

                source: "Adzuna",
                source_url:
                    "https://www.adzuna.co.uk/"
            };
        });

    } catch (error) {
        console.error(
            "Adzuna connection error:",
            error
        );

        return [];
    }
}


/* =========================================================
   HELPERS
========================================================= */

function stripHtml(text) {
    return String(text || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function formatSalary(
    min,
    max,
    currency,
    period
) {
    if (
        min === null ||
        min === undefined ||
        min === ""
    ) {
        if (
            max === null ||
            max === undefined ||
            max === ""
        ) {
            return "";
        }
    }

    const curr =
        currency ||
        "";

    const cleanPeriod =
        period &&
        period !== "annual"
            ? ` / ${period}`
            : "";

    if (
        min !== null &&
        min !== undefined &&
        max !== null &&
        max !== undefined
    ) {
        return `${curr} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}${cleanPeriod}`;
    }

    if (
        min !== null &&
        min !== undefined
    ) {
        return `${curr} ${Number(min).toLocaleString()}+${cleanPeriod}`;
    }

    if (
        max !== null &&
        max !== undefined
    ) {
        return `Up to ${curr} ${Number(max).toLocaleString()}${cleanPeriod}`;
    }

    return "";
                           }
