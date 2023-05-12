import { TestApp, createTestApp } from './../test-utils/test-app';
import { ReviewsService } from './reviews.service';
import { ReviewStatus } from '@greengreystudio/server-package-protocol-reviews';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
    service = app.module.get<ReviewsService>(ReviewsService);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll((done) => {
    done();
  });

  describe('rating top', () => {
    it('should add review to story and get review', async () => {
      const addedBadReview = await service.addReview(
        'story_1',
        'story',
        'player_1',
        1,
        'this story is sooo bad',
      );
      const addedGoodReview = await service.addReview(
        'story_1',
        'story',
        'player_2',
        5,
        'this story is sooo good',
      );
      await service.addReview(
        'story_1',
        'story',
        'player_3',
        5,
        'unpublished review',
      );

      await service.setReviewStatus(addedBadReview.id, ReviewStatus.Published);
      await service.setReviewStatus(addedGoodReview.id, ReviewStatus.Published);
      const reviews = await service.getReviews('story_1', 'story', 10, 0);
      expect(reviews.length).toBe(2);

      const rating = await service.getRating('story_1', 'story');
      const avgRating = (1 + 5) / 2;
      expect(rating).toBe(avgRating);

      const cachedReview = await service.addReview(
        'story_1',
        'story',
        'player_4',
        5,
        'cached review',
      );
      await service.setReviewStatus(cachedReview.id, ReviewStatus.Published);
      await service.updateReview(
        cachedReview.id,
        'player_4',
        1,
        'uncached review',
      );

      const newRating = await service.getRating('story_1', 'story');
      const unCachedReviews = await service.getReviews(
        'story_1',
        'story',
        5,
        0,
      );
      expect(unCachedReviews.length).toBe(3);
      expect(newRating).toBe(avgRating);
    });
  });
});
