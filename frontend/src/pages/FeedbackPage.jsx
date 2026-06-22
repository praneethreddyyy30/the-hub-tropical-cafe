import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, User, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function FeedbackPage() {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [suggestions, setSuggestions] = useState('');
  
  // list of recent feedback
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch reviews on mount
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getFeedbackList();
      setFeedbackList(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const feedbackData = {
        customerName: customerName.trim() || 'Anonymous',
        rating: rating,
        suggestions: suggestions.trim()
      };
      
      await api.submitFeedback(feedbackData);
      setSubmitSuccess(true);
      setCustomerName('');
      setSuggestions('');
      setRating(5);
      
      // Refresh list
      fetchReviews();
      
      // Hide success alert after 4 seconds
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      alert('Failed to submit review. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Guestbook & Reviews</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold dark:text-white mb-2">Customer Feedback</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-light max-w-md mx-auto">
          Loved your pour-over? Pastries too flaky? Let us know what you think. We read every review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Review Form - 5 cols on lg */}
        <div className="lg:col-span-5 bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 p-6 rounded-2xl shadow-sm">
          <h3 className="font-serif text-lg font-bold dark:text-white mb-4">Write a Review</h3>
          
          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/10 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Feedback submitted! Thank you.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Interactive Stars */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Your Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 text-2xl focus:outline-none transition hover:scale-110"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          isActive 
                            ? 'text-cafe-gold fill-cafe-gold' 
                            : 'text-gray-200 dark:text-cafe-wood/20'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Optional (e.g. Liam R.)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal/50 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold transition"
              />
            </div>

            {/* Suggestions */}
            <div>
              <label htmlFor="comments" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Comments & Suggestions</label>
              <textarea
                id="comments"
                rows="4"
                required
                placeholder="How was the coffee? What can we do better?"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal/50 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded-xl font-bold transition hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white text-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* Review Wall - 7 cols on lg */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-serif text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
            <span>Customer Opinions</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/20">
              {feedbackList.length}
            </span>
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-24 bg-gray-200 dark:bg-cafe-chocolate/20 rounded-xl" />
              ))}
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="text-center py-10 bg-gray-50/50 dark:bg-cafe-chocolate/5 border rounded-2xl">
              <p className="text-gray-400 dark:text-gray-500 font-light text-sm">No reviews yet. Be the first to leave one!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {feedbackList.map((review) => (
                <div 
                  key={review.id} 
                  className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-4 rounded-xl shadow-xs"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 bg-cafe-gold/10 text-cafe-gold rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{review.customerName}</span>
                    </div>
                    
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating 
                              ? 'text-cafe-gold fill-cafe-gold' 
                              : 'text-gray-100 dark:text-cafe-wood/20'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 font-light leading-relaxed mb-2.5">
                    {review.suggestions}
                  </p>
                  
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
