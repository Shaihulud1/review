import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '@ggs/server-package-database';
import { ReviewDocument, Review } from '@app/schemas/reviews.schema';
import { ReviewStatus } from '@ggs/server-package-protocol-reviews';

export class ReviewsRepository extends Repository<
  ReviewDocument
> {
  constructor(
    @InjectModel(Review.name)
    protected model: Model<ReviewDocument>,
  ) {
    super(model);
  }

  async getReviewById(id: string) {
    return super.findById(id);
  }

  async getReviews(
    entityId: string,
    entityType: string,
    status: ReviewStatus,
    limit: number,
    offset: number,
  ): Promise<ReviewDocument[]> {
    const result = await this.model
      .find({
        entityId,
        entityType,
        status,
      })
      .skip(offset)
      .limit(limit)
      .lean();

    return result;
  }

  async calculateAveragePublishedRating(
    entityId: string,
    entityType: string,
  ): Promise<number> {
    const rating = await this.model.aggregate([
      {
        $match: {
          entityId,
          entityType,
          status: ReviewStatus.Published,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
        },
      },
    ]);
    return rating[0]?.avgRating ?? 0;
  }
}
