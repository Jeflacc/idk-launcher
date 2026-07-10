import { HttpClient } from '../http-client';

/**
 * Mojang content client. Fetches the Minecraft launcher news feed.
 *
 * Replaces v1's direct renderer-side fetch to
 * https://launchercontent.mojang.com/news.json and the idk-cache:// URL
 * rewriting hack that tried to work around CORS.
 */
export interface MojangNewsItem {
  id: string;
  title: string;
  text: string;
  category: string;
  date: string;
  readMoreLink: string;
  newsPageImage: { url: string } | null;
}

export interface MojangNewsResponse {
  news: MojangNewsItem[];
  count: number;
}

export class MojangContentClient {
  private readonly base = 'https://launchercontent.mojang.com';

  constructor(private readonly http: HttpClient) {}

  getNews(): Promise<MojangNewsResponse> {
    return this.http.getJson(`${this.base}/news.json`);
  }
}
