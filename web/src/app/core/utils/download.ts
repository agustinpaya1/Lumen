/**
 * Triggers a browser download for `url` by synthesising a hidden `<a download>`
 * and clicking it. A real anchor click (rather than navigating or window.open)
 * is what makes downloads work on mobile Safari/Chrome, which otherwise open the
 * image in a new tab.
 *
 * Object URLs are the caller's responsibility to revoke once the click fires.
 * @param target Optional anchor target (e.g. '_blank') for remote URLs.
 */
export function triggerBrowserDownload(url: string, filename: string, target?: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  if (target) {
    link.target = target;
  }
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
