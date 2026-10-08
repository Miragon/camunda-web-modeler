/**
 * Recognizes the editor's own content coming back through the `xml` prop.
 *
 * Every XML the editor reports to the host is remembered. When the host passes one of
 * them back (synchronously or delayed, e.g. after a server round trip) it is an echo and
 * must not be re-imported, otherwise a slow host can make the editor flip between two
 * versions and every import wipes the undo stack and selection.
 *
 * Only pending echoes are kept: a match drops the entry and everything older, so a host
 * that deliberately resets to an earlier version still gets it imported.
 */
export class EchoTracker {
    private pending: string[] = [];

    constructor(private readonly limit = 20) {}

    /**
     * Remembers an XML string that has been reported to the host.
     */
    public emitted(xml: string): void {
        this.pending.push(xml);
        if (this.pending.length > this.limit) {
            this.pending.shift();
        }
    }

    /**
     * Returns true if the XML is an echo of a reported string and forgets it together
     * with all older entries.
     */
    public consume(xml: string): boolean {
        const index = this.pending.indexOf(xml);
        if (index === -1) {
            return false;
        }
        this.pending.splice(0, index + 1);
        return true;
    }

    /**
     * Forgets all pending echoes, e.g. after a new document has been imported.
     */
    public reset(): void {
        this.pending = [];
    }
}
