import { Controller, Get, Post, Put, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CreateChapterDto, CreateLessonDto, UpdateLessonDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    create(@Body() createCourseDto: CreateCourseDto) {
        return this.coursesService.create(createCourseDto);
    }

    @Get()
    findAll() {
        return this.coursesService.findAll();
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
        return this.coursesService.update(id, updateCourseDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.coursesService.findOne(id);
    }

    @Get(':courseId/chapters')
    getChapters(@Param('courseId') courseId: string) {
        return this.coursesService.getChapters(courseId);
    }

    @Post(':courseId/chapters')
    @UseGuards(JwtAuthGuard, AdminGuard)
    createChapter(@Param('courseId') courseId: string, @Body() createChapterDto: CreateChapterDto) {
        return this.coursesService.createChapter(courseId, createChapterDto);
    }

    @Put('chapters/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    updateChapter(@Param('id') id: string, @Body() updateChapterDto: Partial<CreateChapterDto>) {
        return this.coursesService.updateChapter(id, updateChapterDto);
    }

    @Delete('chapters/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    deleteChapter(@Param('id') id: string) {
        return this.coursesService.deleteChapter(id);
    }

    @Post('chapters/:chapterId/lessons')
    @UseGuards(JwtAuthGuard, AdminGuard)
    createLesson(@Param('chapterId') chapterId: string, @Body() createLessonDto: CreateLessonDto) {
        return this.coursesService.createLesson(chapterId, createLessonDto);
    }

    @Put('lessons/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    updateLesson(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
        return this.coursesService.updateLesson(id, updateLessonDto);
    }

    @Delete('lessons/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    deleteLesson(@Param('id') id: string) {
        return this.coursesService.deleteLesson(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    delete(@Param('id') id: string) {
        return this.coursesService.delete(id);
    }
}
