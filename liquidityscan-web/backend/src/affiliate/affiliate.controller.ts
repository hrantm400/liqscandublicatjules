import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('affiliate')
export class AffiliateController {
    constructor(private affiliateService: AffiliateService) { }

    /**
     * POST /affiliate/create - Create affiliate account (generates code)
     */
    @Post('create')
    @UseGuards(JwtAuthGuard)
    async create(@Req() req: any, @Body() body: { code?: string }) {
        return this.affiliateService.createAffiliate(req.user.userId, body.code);
    }

    /**
     * GET /affiliate/stats - Get affiliate dashboard stats
     */
    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getStats(@Req() req: any) {
        return this.affiliateService.getStats(req.user.userId);
    }

    /**
     * GET /affiliate/validate/:code - Validate a referral code (public)
     */
    @Get('validate/:code')
    async validate(@Param('code') code: string) {
        const result = await this.affiliateService.getByCode(code);
        return result || { valid: false };
    }
}
