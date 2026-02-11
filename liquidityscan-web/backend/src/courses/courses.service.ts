import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto, CreateChapterDto, CreateLessonDto, UpdateLessonDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateCourseDto) {
        // Clean up data: convert empty strings to null
        const cleanData: any = {
            title: data.title.trim(),
            description: data.description?.trim() || null,
            coverUrl: data.coverUrl?.trim() || null,
            difficulty: data.difficulty || 'Beginner',
            price: data.price ?? 0,
            subscriptionId: data.subscriptionId?.trim() || null,
        };

        console.log('[CoursesService] Creating course with clean data:', cleanData);

        const course = await this.prisma.course.create({
            data: cleanData,
        });

        // Auto-create one default chapter so admin can add lessons without creating a chapter first
        await this.prisma.chapter.create({
            data: {
                courseId: course.id,
                title: 'Lessons',
                order: 0,
                difficulty: 'Beginner',
                price: 0,
                isFree: true,
            },
        });

        return this.prisma.course.findUnique({
            where: { id: course.id },
            include: {
                chapters: {
                    include: { lessons: true },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }

    async update(id: string, data: UpdateCourseDto) {
        const cleanData: any = {};
        if (data.title !== undefined) cleanData.title = data.title.trim();
        if (data.description !== undefined) cleanData.description = data.description?.trim() || null;
        if (data.coverUrl !== undefined) cleanData.coverUrl = data.coverUrl?.trim() || null;
        if (data.difficulty !== undefined) cleanData.difficulty = data.difficulty.trim();
        return this.prisma.course.update({
            where: { id },
            data: cleanData,
        });
    }

    async findAll() {
        return this.prisma.course.findMany({
            include: {
                chapters: {
                    include: {
                        lessons: {
                            orderBy: {
                                order: 'asc',
                            },
                        },
                        subscriptions: {
                            include: {
                                subscription: true,
                            },
                        },
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.course.findUnique({
            where: { id },
            include: {
                chapters: {
                    include: {
                        lessons: {
                            orderBy: {
                                order: 'asc',
                            },
                        },
                        subscriptions: {
                            include: {
                                subscription: true,
                            },
                        },
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
            },
        });
    }

    async getChapters(courseId: string) {
        return this.prisma.chapter.findMany({
            where: { courseId },
            include: {
                lessons: {
                    orderBy: {
                        order: 'asc',
                    },
                },
                subscriptions: {
                    include: {
                        subscription: true,
                    },
                },
            },
            orderBy: {
                order: 'asc',
            },
        });
    }

    async createChapter(courseId: string, data: CreateChapterDto) {
        // Clean up data: convert empty strings to null
        const cleanData: any = {
            courseId,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            coverUrl: data.coverUrl?.trim() || null,
            videoUrl: data.videoUrl?.trim() || null,
            difficulty: data.difficulty || 'Beginner',
            price: data.price || 0,
            isFree: data.isFree !== undefined ? data.isFree : true,
            order: data.order || 0,
            subscriptions: data.subscriptionIds && data.subscriptionIds.length > 0
                ? {
                    create: data.subscriptionIds.map(subId => ({
                        subscriptionId: subId,
                    })),
                }
                : undefined,
        };
        
        console.log('[CoursesService] Creating chapter with clean data:', cleanData);
        
        return this.prisma.chapter.create({
            data: cleanData,
            include: {
                lessons: true,
                subscriptions: {
                    include: {
                        subscription: true,
                    },
                },
            },
        });
    }

    async updateChapter(id: string, data: Partial<CreateChapterDto>) {
        const cleanData: any = {};
        if (data.title !== undefined) cleanData.title = data.title.trim();
        if (data.description !== undefined) cleanData.description = data.description?.trim() || null;
        if (data.coverUrl !== undefined) cleanData.coverUrl = data.coverUrl?.trim() || null;
        if (data.videoUrl !== undefined) cleanData.videoUrl = data.videoUrl?.trim() || null;
        if (data.difficulty !== undefined) cleanData.difficulty = data.difficulty;
        if (data.price !== undefined) cleanData.price = data.price;
        if (data.isFree !== undefined) cleanData.isFree = data.isFree;
        if (data.order !== undefined) cleanData.order = data.order;
        
        // Handle subscription updates
        if (data.subscriptionIds !== undefined) {
            // Delete existing subscriptions
            await this.prisma.chapterSubscription.deleteMany({
                where: { chapterId: id },
            });
            
            // Create new subscriptions if provided
            if (data.subscriptionIds.length > 0) {
                cleanData.subscriptions = {
                    create: data.subscriptionIds.map(subId => ({
                        subscriptionId: subId,
                    })),
                };
            }
        }
        
        return this.prisma.chapter.update({
            where: { id },
            data: cleanData,
            include: {
                lessons: true,
                subscriptions: {
                    include: {
                        subscription: true,
                    },
                },
            },
        });
    }

    async deleteChapter(id: string) {
        return this.prisma.chapter.delete({ where: { id } });
    }

    async createLesson(chapterId: string, data: CreateLessonDto) {
        return this.prisma.lesson.create({
            data: {
                chapterId,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                videoUrl: data.videoUrl.trim(),
                videoProvider: data.videoProvider?.trim() || null,
                coverUrl: data.coverUrl?.trim() || null,
                order: data.order ?? 0,
            },
        });
    }

    async updateLesson(id: string, data: UpdateLessonDto) {
        const cleanData: any = {};
        if (data.title !== undefined) cleanData.title = data.title.trim();
        if (data.description !== undefined) cleanData.description = data.description?.trim() || null;
        if (data.videoUrl !== undefined) cleanData.videoUrl = data.videoUrl.trim();
        if (data.videoProvider !== undefined) cleanData.videoProvider = data.videoProvider?.trim() || null;
        if (data.coverUrl !== undefined) cleanData.coverUrl = data.coverUrl?.trim() || null;
        if (data.order !== undefined) cleanData.order = data.order;
        return this.prisma.lesson.update({
            where: { id },
            data: cleanData,
        });
    }

    async delete(id: string) {
        return this.prisma.course.delete({ where: { id } });
    }

    async deleteLesson(id: string) {
        return this.prisma.lesson.delete({ where: { id } });
    }
}
