import {
  Controller, Get, Post,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('contracts')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // Manager generates a contract for an accepted application
  @Post('generate')
  @Roles('MANAGER')
  async generateContract(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { applicationId: string },
  ) {
    return this.contractsService.generate(user.id, body.applicationId);
  }

  // Worker fetches their own contracts
  @Get('mine')
  @Roles('WORKER')
  async getMyContracts(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contractsService.findByWorker(user.id);
  }

  // Manager fetches their own contracts
  @Get('mine-as-manager')
  @Roles('MANAGER')
  async getMyContractsAsManager(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contractsService.findByManager(user.id);
  }

  // Worker or Manager retrieves a contract by ID
  @Get(':id')
  async getContract(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contractsService.findById(id, user.id);
  }

  // Worker signs a contract
  @Post(':id/sign')
  @Roles('WORKER')
  async signContract(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { signatureData?: string },
  ) {
    return this.contractsService.sign(id, user.id, body.signatureData);
  }

  // Manager co-signs a contract (PENDING_MANAGER_SIGN → FULLY_SIGNED)
  @Post(':id/manager-sign')
  @Roles('MANAGER')
  async managerSignContract(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { signatureData?: string },
  ) {
    return this.contractsService.managerSign(id, user.id, body.signatureData);
  }
}
