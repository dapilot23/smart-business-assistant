import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.customersService.findAll(user.tenantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.findOne(id, user.tenantId);
  }

  @Post()
  async create(
    @Body() createData: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.create(createData, user.tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.update(id, updateData, user.tenantId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.remove(id, user.tenantId);
  }
}
