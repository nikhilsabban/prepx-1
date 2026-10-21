import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function scrapeGithub(username: string) {
    const proxyUrl = process.env.PROXY_URL;
    const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    const headers = {
        "User-Agent": "AI-Interviewer-MERN-App",
        Accept: "application/vnd.github.v3+json",
    };

    try {
        const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
            httpsAgent,
            headers,
            timeout: 8000,
        });

        return (response.data || []).map((x: any) => ({
            description: x.description || "",
            name: x.name,
            fullName: x.full_name,
            starCount: x.stargazers_count || 0,
        }));
    } catch (err: any) {
        const status = err.response?.status;
        if (status === 404) {
            console.warn(`ℹ️ GitHub profile/user "${username}" not found. Using fallback metadata.`);
        } else {
            console.warn(`⚠️ GitHub API notice for "${username}": ${err.message}`);
        }
        return [
            {
                name: username,
                fullName: username,
                description: `Candidate GitHub Profile: ${username}`,
                starCount: 0,
            },
        ];
    }
}