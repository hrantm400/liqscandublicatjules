import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pricing')
export class PricingController {
    constructor(private pricingService: PricingService) { }

    /**
     * GET /pricing/tier - Get current user's tier info
     */
    @Get('tier')
    @UseGuards(JwtAuthGuard)
    async getTier(@Req() req: any) {
        return this.pricingService.getTierInfo(req.user.userId);
    }
}
