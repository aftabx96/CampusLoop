import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload, Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { imageUploadOptions } from '../../common/upload';
import { CommunityService } from './community.service';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('community')
export class CommunityController {
  constructor(private community: CommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Community feed (announcements pinned on top)' })
  feed(@CurrentUser() user: JwtPayload) {
    return this.community.listFeed(user);
  }

  @Get('people')
  @ApiOperation({ summary: 'People directory for @mention autocomplete' })
  people() {
    return this.community.listPeople();
  }

  @Post('posts')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a post (any signed-in user)' })
  createPost(
    @Body() body: { content: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.community.createPost(user, body.content, image ? `/uploads/${image.filename}` : undefined);
  }

  @Post('announce')
  @Roles(Role.STAFF, Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Super announcement: pinned post that notifies all students' })
  announce(
    @Body() body: { content: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.community.announce(user, body.content, image ? `/uploads/${image.filename}` : undefined);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a post (author or admin)' })
  deletePost(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.community.deletePost(user, id);
  }

  @Patch('posts/:id/hide')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin moderation: hide/unhide a post' })
  setHidden(@Param('id') id: string, @Body() body: { hidden: boolean }) {
    return this.community.setHidden(id, body.hidden);
  }

  @Post('posts/:id/like')
  toggleLike(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.community.toggleLike(user, id);
  }

  @Get('posts/:id/comments')
  listComments(@Param('id') id: string) {
    return this.community.listComments(id);
  }

  @Post('posts/:id/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.community.addComment(user, id, body.content, body.parentId);
  }

  @Delete('comments/:id')
  deleteComment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.community.deleteComment(user, id);
  }
}
