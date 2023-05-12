import { Injectable } from '@nestjs/common';
import { ReviewsRepository } from '@app/repositories/reviews.repository';
import { ConfigService } from '@nestjs/config';
import { ENVName } from '@app/config/app.config';
import { ReviewDocument } from '@app/schemas/reviews.schema';
import { RedisService } from '@app/redis/redis.service';
import { ReviewStatus } from '@ggs/server-package-protocol-reviews';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Добавить отзыв	к сущности
   */
  async addReview(
    entityId: string,
    entityType: string,
    playerId: string,
    rating: number,
    reviewText?: string,
  ): Promise<ReviewDocument> {
    const newReview = this.reviewsRepository.createAndFillModel({
      entityId,
      entityType,
      playerId,
      rating,
      reviewText,
      status: ReviewStatus.Moderation,
    });
    return newReview.save();

  }

  /**
   * Обновить отзыв
   */
  async updateReview(
    id: string,
    playerId: string,
    rating: number,
    reviewText?: string,
  ): Promise<ReviewDocument> {
    const foundReview = await this.reviewsRepository.getReviewById(id);
    if (!foundReview) {
      throw new Error(`Cannot update, review with id ${id} not found`);
    }
    if (foundReview.playerId !== playerId) {
      throw new Error(`Player is not owner of ${id} review`);
    }

    foundReview.rating = rating;
    foundReview.reviewText = reviewText;

    await foundReview.save();

    return foundReview;
  }

  /**
   * Получить отзывы сущности
   */
  async getReviews(
    entityId: string,
    entityType: string,
    limit: number,
    offset: number,
  ): Promise<ReviewDocument[]> {
    const cacheString = `reviews:${entityType}:${entityId}:${limit}:${offset}`;
    const cachedReviews = await this.redisService.get(cacheString);
    if (cachedReviews) {
      return JSON.parse(cachedReviews) as ReviewDocument[];
    }
    const reviews = await this.reviewsRepository.getReviews(
      entityId,
      entityType,
      ReviewStatus.Published,
      limit,
      offset,
    );
    await this.redisService.set(
      cacheString,
      JSON.stringify(reviews),
      'EX',
      this.configService.get<number>(ENVName.cacheTime, 3600),
    );

    return reviews;
  }

  /**
   * Получить средний рейтинг сущности
   */
  async getRating(entityId: string, entityType: string): Promise<Number> {
    const cacheString = `reviews-rating:${entityType}:${entityId}`;
    const cachedRating = await this.redisService.get(cacheString);
    if (cachedRating) {
      return Number(cachedRating);
    }
    const averageRating =
      await this.reviewsRepository.calculateAveragePublishedRating(
        entityId,
        entityType,
      );
    await this.redisService.set(
      cacheString,
      averageRating,
      'EX',
      this.configService.get<number>(ENVName.cacheTime, 3600),
    );

    return averageRating;
  }

  /**
   * Установить статус отзыва
   */
  async setReviewStatus(id: string, status: ReviewStatus): Promise<ReviewDocument> {
    const foundReview = await this.reviewsRepository.getReviewById(id);
    if (!foundReview) {
      throw new Error(`Cannot set status, review with id ${id} not found`);
    }
    foundReview.status = status;
    await foundReview.save();

    return foundReview;
  }
}
