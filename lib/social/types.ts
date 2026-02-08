// Social Media Integration Types

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter';

export interface SocialAccount {
  id: string;
  organization_id: string;
  platform: SocialPlatform;
  platform_user_id: string;
  platform_username: string | null;
  platform_display_name: string | null;
  profile_image_url: string | null;
  page_id: string | null;
  page_name: string | null;
  scopes: string[] | null;
  connected_at: string;
  last_used_at: string | null;
  status: 'active' | 'expired' | 'revoked' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectAccountRequest {
  platform: SocialPlatform;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  platform_user_id: string;
  platform_username?: string;
  platform_display_name?: string;
  profile_image_url?: string;
  page_id?: string;
  page_name?: string;
  page_access_token?: string;
  scopes?: string[];
}

export interface PublishPostRequest {
  account_id: string;
  content: string;
  image_url?: string;
  link_url?: string;
}

export interface PublishPostResponse {
  success: boolean;
  platform_post_id?: string;
  error?: string;
}
