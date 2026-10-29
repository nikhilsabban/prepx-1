import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export interface SpecificRepoMetadata {
  isSpecificRepo: true;
  repoName: string;
  fullName: string;
  owner: string;
  repoUrl: string;
  description: string;
  primaryLanguage: string;
  languages: string[];
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  keyDependencies: string[];
  readmeSummary: string;
  fileStructure: string[];
}

export interface UserRepoMetadata {
  description: string;
  name: string;
  fullName: string;
  starCount: number;
}

const GITHUB_HEADERS = {
  "User-Agent": "PrepX-AI-Interviewer/2.0",
  Accept: "application/vnd.github.v3+json",
};

function getAxiosConfig(timeoutMs: number = 7000) {
  const proxyUrl = process.env.PROXY_URL;
  const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  return {
    httpsAgent,
    headers: GITHUB_HEADERS,
    timeout: timeoutMs,
  };
}

export class GitHubRepoNotFoundError extends Error {
  public status: number = 404;
  constructor(public owner: string, public repo: string) {
    super(`GitHub repository "${owner}/${repo}" was not found or is private.`);
    this.name = "GitHubRepoNotFoundError";
  }
}

/**
 * Deeply scrapes a specific GitHub repository for architectural details, README,
 * languages, topics, dependencies, and root structure.
 */
export async function scrapeSpecificRepo(
  owner: string,
  repo: string
): Promise<SpecificRepoMetadata> {
  const cleanOwner = owner.trim().replace(/^@/, "");
  const cleanRepo = repo.trim().replace(/\.git$/i, "");
  const repoUrl = `https://github.com/${cleanOwner}/${cleanRepo}`;

  const config = getAxiosConfig(8000);
  let defaultBranch = "main";
  let description = "";
  let primaryLanguage = "";
  let topics: string[] = [];
  let stars = 0;
  let forks = 0;
  let openIssues = 0;

  // 1. Fetch Repository Details
  try {
    const repoRes = await axios.get(
      `https://api.github.com/repos/${cleanOwner}/${cleanRepo}`,
      config
    );
    if (repoRes.data) {
      defaultBranch = repoRes.data.default_branch || "main";
      description = repoRes.data.description || "";
      primaryLanguage = repoRes.data.language || "";
      topics = Array.isArray(repoRes.data.topics) ? repoRes.data.topics : [];
      stars = repoRes.data.stargazers_count || 0;
      forks = repoRes.data.forks_count || 0;
      openIssues = repoRes.data.open_issues_count || 0;
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      // Repository does not exist or is private — fail fast without redundant downstream calls
      throw new GitHubRepoNotFoundError(cleanOwner, cleanRepo);
    }
    console.warn(`GitHub API notice for ${cleanOwner}/${cleanRepo}:`, err.message);
  }

  // 2. Fetch Languages Breakdown (Parallel with README & Package JSON)
  const languagePromise = (async () => {
    try {
      const langRes = await axios.get(
        `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/languages`,
        config
      );
      if (langRes.data && typeof langRes.data === "object") {
        return Object.keys(langRes.data);
      }
    } catch {}
    return primaryLanguage ? [primaryLanguage] : [];
  })();

  // 3. Fetch README (Raw Content - Does not consume API rate limits)
  const readmePromise = (async () => {
    const branches = [defaultBranch, "main", "master"];
    for (const b of branches) {
      try {
        const rawRes = await axios.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/README.md`,
          { timeout: 5000 }
        );
        if (typeof rawRes.data === "string" && rawRes.data.trim()) {
          // Clean markdown badges and truncate to meaningful summary
          const cleaned = rawRes.data
            .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // image links
            .replace(/!\[.*?\]\(.*?\)/g, "") // image tags
            .replace(/```[\s\S]*?```/g, "") // code snippets
            .replace(/[#*`_~]/g, " ") // formatting
            .replace(/\s+/g, " ")
            .trim();
          return cleaned.slice(0, 3000);
        }
      } catch {}
    }
    return description ? `Project Description: ${description}` : "";
  })();

  // 4. Fetch Key Dependencies (package.json, requirements.txt, go.mod)
  const depsPromise = (async () => {
    const branches = [defaultBranch, "main", "master"];
    for (const b of branches) {
      try {
        // Try Node / TypeScript package.json
        const pkgRes = await axios.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/package.json`,
          { timeout: 4000 }
        );
        if (pkgRes.data && typeof pkgRes.data === "object") {
          const deps = Object.keys(pkgRes.data.dependencies || {});
          const devDeps = Object.keys(pkgRes.data.devDependencies || {});
          const all = Array.from(new Set([...deps, ...devDeps]));
          if (all.length > 0) return all.slice(0, 25);
        }
      } catch {}

      try {
        // Try Python requirements.txt
        const reqRes = await axios.get(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${b}/requirements.txt`,
          { timeout: 4000 }
        );
        if (typeof reqRes.data === "string" && reqRes.data.trim()) {
          const lines = reqRes.data
            .split("\n")
            .map((l) => l.trim().split(/[=<>~]/)[0]?.trim())
            .filter(Boolean) as string[];
          if (lines.length > 0) return lines.slice(0, 20);
        }
      } catch {}
    }
    return [];
  })();

  // 5. Fetch Root Directory Structure
  const structurePromise = (async () => {
    try {
      const contentsRes = await axios.get(
        `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents`,
        config
      );
      if (Array.isArray(contentsRes.data)) {
        return contentsRes.data.map((item: any) => `${item.name}${item.type === "dir" ? "/" : ""}`).slice(0, 25);
      }
    } catch {}
    return [];
  })();

  const [languages, readmeSummary, keyDependencies, fileStructure] = await Promise.all([
    languagePromise,
    readmePromise,
    depsPromise,
    structurePromise,
  ]);

  return {
    isSpecificRepo: true,
    repoName: cleanRepo,
    fullName: `${cleanOwner}/${cleanRepo}`,
    owner: cleanOwner,
    repoUrl,
    description: description || `Repository: ${cleanRepo} created by ${cleanOwner}`,
    primaryLanguage: primaryLanguage || (languages[0] || "JavaScript/TypeScript"),
    languages: languages.length > 0 ? languages : [primaryLanguage || "TypeScript"],
    topics,
    stars,
    forks,
    openIssues,
    keyDependencies,
    readmeSummary: readmeSummary || description || `Technical project ${cleanRepo} on GitHub.`,
    fileStructure,
  };
}

/**
 * Scrapes all repos for a given user profile (fallback mode)
 */
export async function scrapeGithub(username: string): Promise<UserRepoMetadata[]> {
  const config = getAxiosConfig(8000);

  try {
    const response = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`,
      config
    );

    return (response.data || []).map((x: any) => ({
      description: x.description || "",
      name: x.name,
      fullName: x.full_name,
      starCount: x.stargazers_count || 0,
    }));
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 404) {
      console.warn(`ℹ️ GitHub profile/user "${username}" not found.`);
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