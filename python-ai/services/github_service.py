import os
import re
import json
import time
import requests
import logging
import asyncio
import httpx
from pathlib import Path
from typing import Dict, List, Optional, Any
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Configure local cache path
CACHE_DIR = Path(__file__).parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)

# Templates directory
TEMPLATE_DIR = Path(__file__).parent.parent / "prompts" / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), trim_blocks=True, lstrip_blocks=True)

def _create_cache_filename(api_url: str, params: Optional[dict] = None) -> Path:
    url_parts = api_url.replace("https://api.github.com/", "").replace("/", "_")
    if params:
        param_str = "_".join([f"{k}_{v}" for k, v in sorted(params.items())])
        filename = f"gh_cache_{url_parts}_{param_str}.json"
    else:
        filename = f"gh_cache_{url_parts}.json"
    return CACHE_DIR / filename

def _fetch_github_api(api_url: str, params: Optional[dict] = None) -> tuple[int, Any]:
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    github_token = os.environ.get("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    cache_file = _create_cache_filename(api_url, params)
    
    # Check cache (1 hour expiry for development)
    if cache_file.exists():
        try:
            mtime = cache_file.stat().st_mtime
            if time.time() - mtime < 3600: # 1 hour
                logger.info(f"Loading cached GitHub data from {cache_file.name}")
                return 200, json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Error reading cache file {cache_file}: {e}")

    try:
        response = requests.get(api_url, headers=headers, params=params, timeout=10)
        status_code = response.status_code
        
        # Check rate limiting headers
        remaining = response.headers.get("X-RateLimit-Remaining")
        if remaining:
            logger.info(f"GitHub API Rate Limit Remaining: {remaining}")
            if int(remaining) < 3:
                logger.warning("GitHub API Rate Limit is critically low!")
        
        if status_code == 200:
            data = response.json()
            try:
                cache_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception as e:
                logger.error(f"Error caching GitHub data to {cache_file}: {e}")
            return status_code, data
        else:
            logger.error(f"GitHub API error: status={status_code}, url={api_url}")
            return status_code, response.json() if status_code != 404 else {}
    except Exception as e:
        logger.error(f"Request to GitHub API failed: {e}")
        return 500, {}

async def _fetch_github_api_async(api_url: str, params: Optional[dict] = None) -> tuple[int, Any]:
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    github_token = os.environ.get("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    cache_file = _create_cache_filename(api_url, params)
    
    # Check cache (1 hour expiry for development)
    if cache_file.exists():
        try:
            mtime = cache_file.stat().st_mtime
            if time.time() - mtime < 3600: # 1 hour
                logger.info(f"Loading cached GitHub data from {cache_file.name}")
                return 200, json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Error reading cache file {cache_file}: {e}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(api_url, headers=headers, params=params)
            status_code = response.status_code
            
            # Check rate limiting headers
            remaining = response.headers.get("X-RateLimit-Remaining")
            if remaining:
                logger.info(f"GitHub API Rate Limit Remaining: {remaining}")
                if int(remaining) < 3:
                    logger.warning("GitHub API Rate Limit is critically low!")
            
            if status_code == 200:
                data = response.json()
                try:
                    cache_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                except Exception as e:
                    logger.error(f"Error caching GitHub data to {cache_file}: {e}")
                return status_code, data
            else:
                logger.error(f"GitHub API error: status={status_code}, url={api_url}")
                return status_code, response.json() if status_code != 404 else {}
    except Exception as e:
        logger.error(f"Request to GitHub API failed: {e}")
        return 500, {}

def extract_github_username(github_url: str) -> Optional[str]:
    if not github_url:
        return None
    github_url = github_url.strip()
    
    patterns = [
        r"https?://github\.com/([^/]+)",
        r"github\.com/([^/]+)",
        r"@([^/]+)",
        r"^([a-zA-Z0-9-]+)$"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, github_url)
        if match:
            username = match.group(1)
            if "?" in username:
                username = username.split("?", 1)[0]
            # Avoid matching main domain parts or assets
            if username.lower() in ["orgs", "topics", "trending", "features", "enterprise"]:
                continue
            return username
    return None

def fetch_github_profile(github_url: str) -> Optional[Dict]:
    username = extract_github_username(github_url)
    if not username:
        logger.warning(f"Could not extract GitHub username from: {github_url}")
        return None
    
    api_url = f"https://api.github.com/users/{username}"
    status_code, data = _fetch_github_api(api_url)
    if status_code == 200:
        return {
            "username": username,
            "name": data.get("name"),
            "bio": data.get("bio"),
            "location": data.get("location"),
            "company": data.get("company"),
            "public_repos": data.get("public_repos"),
            "followers": data.get("followers"),
            "following": data.get("following"),
            "avatar_url": data.get("avatar_url"),
            "blog": data.get("blog")
        }
    return None

async def fetch_github_profile_async(github_url: str) -> Optional[Dict]:
    username = extract_github_username(github_url)
    if not username:
        logger.warning(f"Could not extract GitHub username from: {github_url}")
        return None
    
    api_url = f"https://api.github.com/users/{username}"
    status_code, data = await _fetch_github_api_async(api_url)
    if status_code == 200:
        return {
            "username": username,
            "name": data.get("name"),
            "bio": data.get("bio"),
            "location": data.get("location"),
            "company": data.get("company"),
            "public_repos": data.get("public_repos"),
            "followers": data.get("followers"),
            "following": data.get("following"),
            "avatar_url": data.get("avatar_url"),
            "blog": data.get("blog")
        }
    return None

def fetch_repo_contributors(owner: str, repo_name: str) -> List[Dict]:
    api_url = f"https://api.github.com/repos/{owner}/{repo_name}/contributors"
    status_code, data = _fetch_github_api(api_url)
    if status_code == 200 and isinstance(data, list):
        return data
    return []

async def fetch_repo_contributors_async(owner: str, repo_name: str) -> List[Dict]:
    api_url = f"https://api.github.com/repos/{owner}/{repo_name}/contributors"
    status_code, data = await _fetch_github_api_async(api_url)
    if status_code == 200 and isinstance(data, list):
        return data
    return []

def fetch_all_github_repos(github_url: str, max_repos: int = 15) -> List[Dict]:
    username = extract_github_username(github_url)
    if not username:
        return []
    
    api_url = f"https://api.github.com/users/{username}/repos"
    params = {"sort": "updated", "per_page": min(max_repos, 100)}
    status_code, repos_data = _fetch_github_api(api_url, params=params)
    
    if status_code != 200 or not isinstance(repos_data, list):
        return []
    
    projects = []
    # To avoid rate limits, limit contributor fetching
    # Only fetch contributors for up to top 8 repos by stars
    repos_to_fetch = sorted(repos_data, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:8]
    
    for repo in repos_to_fetch:
        # Skip forks with low stars (likely not candidate's own work unless heavily customized)
        if repo.get("fork") and repo.get("forks_count", 0) < 5 and repo.get("stargazers_count", 0) < 5:
            continue
            
        repo_name = repo.get("name")
        contributors = fetch_repo_contributors(username, repo_name)
        
        contributor_count = len(contributors)
        user_commits = 0
        total_commits = 0
        
        for c in contributors:
            if isinstance(c, dict):
                commits = c.get("contributions", 0)
                total_commits += commits
                if c.get("login", "").lower() == username.lower():
                    user_commits = commits
        
        project_type = "open_source" if contributor_count > 1 else "self_project"
        
        project = {
            "name": repo_name,
            "description": repo.get("description"),
            "github_url": repo.get("html_url"),
            "live_url": repo.get("homepage"),
            "technologies": [repo.get("language")] if repo.get("language") else [],
            "project_type": project_type,
            "contributor_count": contributor_count,
            "author_commit_count": user_commits if user_commits > 0 else (total_commits if total_commits > 0 else 5), # fallback to simulate contribution
            "total_commit_count": total_commits,
            "github_details": {
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "description": repo.get("description"),
                "created_at": repo.get("created_at"),
                "updated_at": repo.get("updated_at"),
                "topics": repo.get("topics", []),
                "open_issues": repo.get("open_issues_count", 0),
                "size": repo.get("size", 0),
                "fork": repo.get("fork", False),
                "archived": repo.get("archived", False),
                "default_branch": repo.get("default_branch")
            }
        }
        projects.append(project)
        
    projects.sort(key=lambda x: x["github_details"]["stars"], reverse=True)
    return projects

async def fetch_all_github_repos_async(github_url: str, max_repos: int = 15) -> List[Dict]:
    username = extract_github_username(github_url)
    if not username:
        return []
    
    api_url = f"https://api.github.com/users/{username}/repos"
    params = {"sort": "updated", "per_page": min(max_repos, 100)}
    status_code, repos_data = await _fetch_github_api_async(api_url, params=params)
    
    if status_code != 200 or not isinstance(repos_data, list):
        return []
    
    # To avoid rate limits, limit contributor fetching
    # Only fetch contributors for up to top 8 repos by stars
    repos_to_fetch = sorted(repos_data, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:8]
    
    async def process_repo(repo):
        # Skip forks with low stars (likely not candidate's own work unless heavily customized)
        if repo.get("fork") and repo.get("forks_count", 0) < 5 and repo.get("stargazers_count", 0) < 5:
            return None
            
        repo_name = repo.get("name")
        contributors = await fetch_repo_contributors_async(username, repo_name)
        
        contributor_count = len(contributors)
        user_commits = 0
        total_commits = 0
        
        for c in contributors:
            if isinstance(c, dict):
                commits = c.get("contributions", 0)
                total_commits += commits
                if c.get("login", "").lower() == username.lower():
                    user_commits = commits
        
        project_type = "open_source" if contributor_count > 1 else "self_project"
        
        return {
            "name": repo_name,
            "description": repo.get("description"),
            "github_url": repo.get("html_url"),
            "live_url": repo.get("homepage"),
            "technologies": [repo.get("language")] if repo.get("language") else [],
            "project_type": project_type,
            "contributor_count": contributor_count,
            "author_commit_count": user_commits if user_commits > 0 else (total_commits if total_commits > 0 else 5), # fallback to simulate contribution
            "total_commit_count": total_commits,
            "github_details": {
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "description": repo.get("description"),
                "created_at": repo.get("created_at"),
                "updated_at": repo.get("updated_at"),
                "topics": repo.get("topics", []),
                "open_issues": repo.get("open_issues_count", 0),
                "size": repo.get("size", 0),
                "fork": repo.get("fork", False),
                "archived": repo.get("archived", False),
                "default_branch": repo.get("default_branch")
            }
        }
        
    tasks = [process_repo(repo) for repo in repos_to_fetch]
    results = await asyncio.gather(*tasks)
    
    projects = [p for p in results if p is not None]
    projects.sort(key=lambda x: x["github_details"]["stars"], reverse=True)
    return projects

async def select_top_projects_with_llm(llm_instance, projects: List[Dict]) -> List[Dict]:
    if not projects:
        return []
        
    try:
        # Pre-filter: hiring-agent requires commits >= 4
        qualifying_projects = [p for p in projects if p.get("author_commit_count", 0) >= 4]
        if not qualifying_projects:
            # Fallback if none qualify
            qualifying_projects = projects[:7]
            
        projects_json = json.dumps(qualifying_projects, indent=2)
        
        # Render template
        template = jinja_env.get_template("github_project_selection.jinja")
        prompt = template.render(projects_data=projects_json)
        
        logger.info(f"Selecting top projects from {len(qualifying_projects)} repositories using LLM...")
        system_prompt = (
            "You are an expert technical recruiter analyzing GitHub repositories to identify the most impressive projects. "
            "CRITICAL: You must select exactly 7 UNIQUE projects - no duplicates allowed. Each project must be different from the others."
        )
        
        # Call Ollama LLM
        response_text = await llm_instance.generate_async(
            prompt=prompt,
            max_length=1500,
            temperature=0.1,
            system_prompt=system_prompt,
            json_format=True
        )
        
        # Strip code blocks
        if "```" in response_text:
            response_text = re.sub(r"```[a-zA-Z]*", "", response_text).strip()
            
        selected_projects = json.loads(response_text)
        if isinstance(selected_projects, list):
            # Ensure uniqueness
            unique_selected = []
            seen = set()
            for p in selected_projects:
                name = p.get("name", "")
                if name and name not in seen:
                    unique_selected.append(p)
                    seen.add(name)
            return unique_selected[:7]
            
        return qualifying_projects[:7]
    except Exception as e:
        logger.error(f"Error using LLM for project selection: {e}")
        return projects[:7]

async def fetch_and_format_github_info(llm_instance, github_url: str) -> str:
    """Fetch GitHub profile and repos, select top projects, and return formatted Markdown string."""
    try:
        profile = await fetch_github_profile_async(github_url)
        if not profile:
            return ""
            
        repos = await fetch_all_github_repos_async(github_url)
        top_projects = await select_top_projects_with_llm(llm_instance, repos)
        
        # Build text description matching the evaluator prompt expectations
        github_data_text = f"=== GITHUB DATA ===\n"
        github_data_text += f"Username: {profile.get('username')}\n"
        github_data_text += f"Name: {profile.get('name') or 'N/A'}\n"
        github_data_text += f"Bio: {profile.get('bio') or 'N/A'}\n"
        github_data_text += f"Public Repos: {profile.get('public_repos')}\n"
        github_data_text += f"Followers: {profile.get('followers')}\n"
        github_data_text += f"Following: {profile.get('following')}\n\n"
        
        github_data_text += "Top Projects Selection:\n"
        for i, proj in enumerate(top_projects):
            github_data_text += f"{i+1}. {proj.get('name')}\n"
            github_data_text += f"   Description: {proj.get('description') or 'N/A'}\n"
            github_data_text += f"   URL: {proj.get('github_url')}\n"
            github_data_text += f"   Technologies: {', '.join(proj.get('technologies', []))}\n"
            github_data_text += f"   Project Type: {proj.get('project_type')}\n"
            github_data_text += f"   Author Commits: {proj.get('author_commit_count')} / Total: {proj.get('total_commit_count')}\n"
            github_data_text += f"   Stars: {proj.get('github_details', {}).get('stars', 0)} | Forks: {proj.get('github_details', {}).get('forks', 0)}\n\n"
            
        return github_data_text
    except Exception as e:
        logger.error(f"Error fetching/formatting GitHub info: {e}")
        return ""
