import { Controller, Get, Inject, Param } from '@nestjs/common';
import { WalletProfileDto } from './dto/wallet-profile.dto';
import { WalletProfileService } from './wallet-profile.service';

@Controller('wallet-profile')
export class WalletProfileController {
  constructor(@Inject(WalletProfileService) private readonly walletProfileService: WalletProfileService) {}

  @Get(':walletAddress')
  async getWalletProfile(
    @Param('walletAddress') walletAddress: string,
  ): Promise<WalletProfileDto> {
    return this.walletProfileService.getWalletProfile(walletAddress);
  }
}

