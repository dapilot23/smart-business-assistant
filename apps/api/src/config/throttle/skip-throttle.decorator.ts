import { SetMetadata } from '@nestjs/common';
import { SKIP_THROTTLE_KEY } from './tenant-throttler.guard';

export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);
