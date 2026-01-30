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
import { TechnicianSkillsService } from './technician-skills.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { SetSkillsDto } from './dto/set-skills.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('team')
@UseGuards(ClerkAuthGuard)
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly skillsService: TechnicianSkillsService,
  ) {}

  @Get()
  async getTeamMembers(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.teamService.getTeamMembers(tenantId);
  }

  @Get('invitations')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
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
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateTeamMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateTeamMemberDto,
  ) {
    const tenantId = req.tenantId;
    return this.teamService.updateTeamMember(tenantId, id, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async removeTeamMember(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.removeTeamMember(tenantId, id);
  }

  @Post('invite')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async inviteTeamMember(
    @Req() req: any,
    @Body() data: InviteTeamMemberDto,
  ) {
    const tenantId = req.tenantId;
    const invitedBy = req.userId;
    return this.teamService.inviteTeamMember(tenantId, data, invitedBy);
  }

  @Delete('invitations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async cancelInvitation(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.cancelInvitation(tenantId, id);
  }

  @Post('invitations/:id/resend')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async resendInvitation(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.teamService.resendInvitation(tenantId, id);
  }

  @Public()
  @Post('accept-invitation')
  async acceptInvitation(@Body() data: AcceptInvitationDto) {
    return this.teamService.acceptInvitation(data.token, data.clerkId);
  }

  // ============================================
  // Technician Skills (Sprint 7.6)
  // ============================================

  @Post(':id/skills')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async setSkills(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() data: SetSkillsDto,
  ) {
    const tenantId = req.tenantId;
    await this.skillsService.setSkills(userId, tenantId, data.skills);
    return { success: true };
  }

  @Get(':id/skills')
  async getSkills(@Req() req: any, @Param('id') userId: string) {
    const tenantId = req.tenantId;
    return this.skillsService.getSkillsForUser(userId, tenantId);
  }

  @Delete(':id/skills/:serviceId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async removeSkill(
    @Req() req: any,
    @Param('id') userId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const tenantId = req.tenantId;
    await this.skillsService.removeSkill(userId, serviceId, tenantId);
    return { success: true };
  }

  @Get('qualified/:serviceId')
  async getTechniciansForService(
    @Req() req: any,
    @Param('serviceId') serviceId: string,
  ) {
    const tenantId = req.tenantId;
    return this.skillsService.getTechniciansForService(serviceId, tenantId);
  }
}
