import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('team')
@UseGuards(ClerkAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async getTeamMembers(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.teamService.getTeamMembers(tenantId);
  }

  @Get('invitations')
  async getInvitations(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.teamService.getInvitations(tenantId);
  }

  @Get(':id')
  async getTeamMember(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.getTeamMember(tenantId, id);
  }

  @Patch(':id')
  async updateTeamMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateTeamMemberDto,
  ) {
    const tenantId = req.tenantId;
    return this.teamService.updateTeamMember(tenantId, id, data);
  }

  @Delete(':id')
  async removeTeamMember(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.removeTeamMember(tenantId, id);
  }

  @Post('invite')
  async inviteTeamMember(
    @Req() req: any,
    @Body() data: InviteTeamMemberDto,
  ) {
    const tenantId = req.tenantId;
    const invitedBy = req.userId;
    return this.teamService.inviteTeamMember(tenantId, data, invitedBy);
  }

  @Delete('invitations/:id')
  async cancelInvitation(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.cancelInvitation(tenantId, id);
  }

  @Post('invitations/:id/resend')
  async resendInvitation(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.resendInvitation(tenantId, id);
  }

  @Public()
  @Post('accept-invitation')
  async acceptInvitation(@Body() data: AcceptInvitationDto) {
    return this.teamService.acceptInvitation(data.token, data.clerkId);
  }
}
