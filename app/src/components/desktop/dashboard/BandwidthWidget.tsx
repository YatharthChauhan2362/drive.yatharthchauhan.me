import { BandwidthStats } from '../../../types';
import { formatBytes } from '../../../utils';

interface BandwidthWidgetProps {
    bandwidth: BandwidthStats | null;
}

export function BandwidthWidget({ bandwidth }: BandwidthWidgetProps) {
    if (!bandwidth) return null;

    const totalBytes = bandwidth.up_bytes + bandwidth.down_bytes;
    const limit = 10 * 1024 * 1024 * 1024 * 1024; // 10TB
    const percent = Math.min((totalBytes / limit) * 100, 100);

    return (
        <div className="mt-1.5 space-y-1 text-metadata text-app-text-secondary">
            <div className="flex justify-between">
                <span>Data Transferred (Session):</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-app-border">
                <div
                    className="h-full rounded-full bg-app-accent transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-badge text-app-text-tertiary font-medium">
                <span>{formatBytes(totalBytes)}</span>
                <span>Unlimited Storage</span>
            </div>
        </div>
    );
}
