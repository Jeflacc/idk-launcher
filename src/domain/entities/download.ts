import type { DownloadItem } from '@shared/types';

export class DownloadItemEntity implements DownloadItem {
  constructor(
    public readonly url: string,
    public readonly targetPath: string,
    public readonly filename: string,
    public readonly size?: number,
    public readonly sha1?: string,
    public readonly skipIfPresent: boolean = true,
  ) {}

  /** An item is integrity-protected iff a sha1 is present. */
  get hasIntegrity(): boolean {
    return Boolean(this.sha1);
  }

  get requiresVerification(): boolean {
    return this.hasIntegrity;
  }
}
