import { Octokit } from 'octokit';
import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';

export async function checkRepoExists(
  octokit: Octokit,
  owner: string,
  repoName: string
): Promise<boolean> {
  try {
    await octokit.rest.repos.get({ owner, repo: repoName });
    return true;
  } catch (error: any) {
    if (error.status === 404) return false;
    throw error;
  }
}

export async function createGitHubRepo(job: ProvisioningJob): Promise<ProvisioningResult> {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG;
  const templateRepo = process.env.GITHUB_TEMPLATE_REPO;

  if (!token || !org || !templateRepo) {
    return {
      success: false,
      step: 'github-repo',
      error: 'Missing GitHub environment variables (GITHUB_TOKEN, GITHUB_ORG, GITHUB_TEMPLATE_REPO)'
    };
  }

  const octokit = new Octokit({ auth: token });
  const repoName = `client-${job.clientId}-app`;

  try {
    // Idempotency: Check if repo already exists
    const exists = await checkRepoExists(octokit, org, repoName);
    if (exists) {
      console.log(`Repository ${repoName} already exists, skipping creation`);
      return {
        success: true,
        step: 'github-repo',
        data: {
          githubRepoName: repoName,
          githubRepoUrl: `https://github.com/${org}/${repoName}`
        }
      };
    }

    // Create from template
    console.log(`Creating GitHub repository: ${repoName}`);
    const { data: repo } = await octokit.rest.repos.createUsingTemplate({
      template_owner: org,
      template_repo: templateRepo,
      owner: org,
      name: repoName,
      private: true,
      description: `Client ${job.clientId} (${job.clientName}) - DraggonnB CRMM`,
      include_all_branches: false
    });

    console.log(`Created repository: ${repo.html_url}`);

    return {
      success: true,
      step: 'github-repo',
      data: {
        githubRepoName: repo.name,
        githubRepoUrl: repo.html_url
      }
    };
  } catch (error) {
    console.error('GitHub repository creation failed:', error);
    return {
      success: false,
      step: 'github-repo',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
