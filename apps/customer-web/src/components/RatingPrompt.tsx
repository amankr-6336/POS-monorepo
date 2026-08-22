import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@pos/ui";
import { formatCurrency } from "@pos/utils";

const API_BASE_URL = "http://localhost:5000/api/v1";

interface RatingPromptProps {
  order: any;
  customerToken: string | null;
  onClose: () => void;
}

export default function RatingPrompt({ order, customerToken, onClose }: RatingPromptProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [overallRating, setOverallRating] = useState<number>(0);
  const [overallComment, setOverallComment] = useState<string>("");
  
  // dishRatings dict: { [menuItemId]: { rating: number, comment: string, tags: string[] } }
  const [dishRatings, setDishRatings] = useState<Record<string, { rating: number; comment: string; tags: string[] }>>({});
  
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const ratingTags = ["Delicious", "Cold Food", "Slow Service", "Too Spicy", "Perfect Portion", "Beautifully Presented"];

  // Fetch rating on load to check if already rated (to prefill or decide edit window status)
  useEffect(() => {
    if (!order?._id || !customerToken) return;

    async function checkRating() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/orders/${order._id}/rating`, {
          headers: { Authorization: `Bearer ${customerToken}` },
        });
        if (res.ok) {
          const ratingData = await res.json();
          if (ratingData) {
            // Rating exists, check if within 30 min edit window
            const createdTime = new Date(ratingData.createdAt).getTime();
            const EDIT_WINDOW_MS = 30 * 60 * 1000;
            if (Date.now() - createdTime < EDIT_WINDOW_MS) {
              setIsEditMode(true);
              setOverallRating(ratingData.overallRating);
              setOverallComment(ratingData.overallComment || "");
              
              // Prefill dish ratings
              const drMap: Record<string, any> = {};
              (ratingData.dishRatings || []).forEach((dr: any) => {
                drMap[dr.menuItemId] = {
                  rating: dr.rating,
                  comment: dr.comment || "",
                  tags: dr.tags || [],
                };
              });
              setDishRatings(drMap);
            } else {
              // Edit window expired, do not show prompt
              onClose();
            }
          }
        }
      } catch (err) {
        console.error("Error checking rating status:", err);
      }
    }
    checkRating();
  }, [order?._id, customerToken]);

  const handleSelectOverallStar = (stars: number) => {
    setOverallRating(stars);
  };

  const handleSelectDishStar = (menuItemId: string, stars: number) => {
    setDishRatings((prev) => ({
      ...prev,
      [menuItemId]: {
        ...(prev[menuItemId] || { comment: "", tags: [] }),
        rating: stars,
      },
    }));
  };

  const handleDishCommentChange = (menuItemId: string, comment: string) => {
    setDishRatings((prev) => ({
      ...prev,
      [menuItemId]: {
        ...(prev[menuItemId] || { rating: 5, tags: [] }),
        comment,
      },
    }));
  };

  const handleToggleTag = (menuItemId: string, tag: string) => {
    setDishRatings((prev) => {
      const current = prev[menuItemId] || { rating: 5, comment: "", tags: [] };
      const exists = current.tags.includes(tag);
      const nextTags = exists 
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag];
      
      return {
        ...prev,
        [menuItemId]: {
          ...current,
          tags: nextTags,
        },
      };
    });
  };

  const handleSubmit = async (submitDishes: boolean) => {
    if (overallRating === 0) {
      setErrorMsg("Please select an overall rating");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    // Prepare dish ratings payload
    const formattedDishRatings = submitDishes
      ? Object.entries(dishRatings).map(([menuItemId, dr]) => ({
          menuItemId,
          rating: dr.rating,
          comment: dr.comment || "",
          tags: dr.tags || [],
        }))
      : [];

    try {
      const res = await fetch(`${API_BASE_URL}/public/orders/${order._id}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          overallRating,
          overallComment,
          dishRatings: formattedDishRatings,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Failed to submit rating");
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Click outside to close (or dismiss) */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[#FAF4EB] text-[#2A2118] rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-[#e8dfd3]"
      >
        {/* Ticket Perforated top edge */}
        <div className="w-full h-3 relative overflow-hidden select-none pointer-events-none z-10 flex-shrink-0">
          <div 
            className="absolute top-0 inset-x-0 h-3 bg-transparent" 
            style={{ 
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.6) 4px, #FAF4EB 4.5px)", 
              backgroundSize: "12px 24px", 
              backgroundPosition: "-6px -12px" 
            }}
          ></div>
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto flex-1 font-sans">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: step === 1 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: step === 1 ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-5"
              >
                {step === 1 ? (
                  <>
                    {/* Overall Rating Section */}
                    <div className="text-center mt-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block mb-1">
                        {isEditMode ? "Edit Your Review" : "We Value Your Feedback"}
                      </span>
                      <h2 className="text-2xl font-serif font-black text-[#2A2118] tracking-tight">
                        Rate Your Experience
                      </h2>
                      <p className="text-xs text-[#5e4b3c] mt-1 font-light leading-relaxed">
                        Table {order.tableId?.label || "Session"} • Order #{order._id.slice(-6).toUpperCase()}
                      </p>
                    </div>

                    {/* Stars row */}
                    <div className="flex justify-center items-center gap-3 py-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleSelectOverallStar(star)}
                          className="p-1 hover:scale-110 active:scale-95 transition-all text-[#FAF4EB]"
                        >
                          <Star
                            className={`w-10 h-10 ${
                              overallRating >= star 
                                ? "fill-[#E3A339] stroke-[#E3A339]" 
                                : "stroke-[#bcae9e] fill-transparent"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Overall Comment input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Comments
                      </label>
                      <textarea
                        value={overallComment}
                        onChange={(e) => setOverallComment(e.target.value)}
                        placeholder="Tell us what you liked or how we can improve..."
                        rows={3}
                        className="w-full text-sm p-3 bg-[#fdfaf5] border border-[#e2d5c3] rounded-xl focus:outline-none focus:border-[#E3A339] placeholder-[#a69785] text-[#2A2118]"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-600 text-center font-semibold mt-1 bg-red-100/50 p-2 rounded-lg border border-red-200">
                        {errorMsg}
                      </p>
                    )}

                    {/* Buttons row */}
                    <div className="flex flex-col gap-2 mt-4">
                      <Button
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="w-full py-3 bg-[#E3A339] hover:bg-[#c98d28] text-white rounded-xl font-bold flex items-center justify-center gap-2 border-none shadow-md shadow-[#E3A339]/20"
                      >
                        {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                        Submit Feedback
                      </Button>
                      
                      {order.items?.length > 0 && (
                        <Button
                          variant="outline"
                          disabled={loading}
                          onClick={() => setStep(2)}
                          className="w-full py-3 border border-[#c5b5a2] hover:bg-[#f3eadf] text-[#2A2118] rounded-xl font-bold"
                        >
                          Rate Individual Dishes
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Dish level Rating section */}
                    <div className="flex items-center gap-3 border-b border-[#ebdcc8] pb-3">
                      <button 
                        onClick={() => setStep(1)} 
                        className="p-1 hover:bg-[#f3eadf] rounded-lg text-[#5e4b3c] transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="font-serif font-black text-lg text-[#2A2118]">Rate Your Dishes</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Step 2 of 2</p>
                      </div>
                    </div>

                    {/* List of items */}
                    <div className="flex flex-col gap-6 max-h-[45vh] overflow-y-auto pr-1">
                      {order.items.map((item: any) => {
                        const itemRatingState = dishRatings[item.menuItemId] || { rating: 5, comment: "", tags: [] };
                        return (
                          <div key={item.menuItemId} className="flex flex-col gap-2.5 border-b border-[#ebdcc8]/50 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-[#2A2118]">{item.name}</h4>
                                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{formatCurrency(item.price)}</span>
                              </div>
                              {/* Star selectors */}
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => handleSelectDishStar(item.menuItemId, star)}
                                    className="p-0.5"
                                  >
                                    <Star
                                      className={`w-5 h-5 ${
                                        itemRatingState.rating >= star 
                                          ? "fill-[#E3A339] stroke-[#E3A339]" 
                                          : "stroke-[#c2b4a3] fill-transparent"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Tags list */}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {ratingTags.map((tag) => {
                                const isSelected = itemRatingState.tags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    onClick={() => handleToggleTag(item.menuItemId, tag)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                      isSelected
                                        ? "bg-[#3A5A40] text-white border-[#3A5A40]"
                                        : "bg-[#fdfaf5] text-[#5e4b3c] border-[#ebdcc8]"
                                    }`}
                                  >
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Short Comment Input */}
                            <input
                              type="text"
                              value={itemRatingState.comment}
                              onChange={(e) => handleDishCommentChange(item.menuItemId, e.target.value)}
                              placeholder="Add optional notes about this dish..."
                              className="w-full text-xs p-2.5 bg-[#fdfaf5] border border-[#e2d5c3] rounded-lg focus:outline-none focus:border-[#E3A339] placeholder-[#a69785] text-[#2A2118]"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-600 text-center font-semibold mt-1 bg-red-100/50 p-2 rounded-lg border border-red-200">
                        {errorMsg}
                      </p>
                    )}

                    {/* Actions row */}
                    <div className="flex gap-3 mt-2 border-t border-[#ebdcc8] pt-4">
                      <Button
                        variant="secondary"
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 border border-[#c5b5a2] hover:bg-[#f3eadf] text-[#2A2118] rounded-xl font-bold bg-transparent"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="flex-1 py-3 bg-[#E3A339] hover:bg-[#c98d28] text-white rounded-xl font-bold flex items-center justify-center gap-2 border-none shadow-md"
                      >
                        {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                        Submit Review
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              /* Success / Ticket Stamp State */
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex flex-col items-center justify-center py-10 gap-4 text-center"
              >
                {/* Stamp animation block */}
                <motion.div
                  initial={{ rotate: -15, scale: 2, opacity: 0 }}
                  animate={{ rotate: -8, scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-emerald-600/10 border-4 border-dashed border-[#3A5A40] rounded-full flex items-center justify-center text-[#3A5A40] shadow-inner"
                >
                  <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                </motion.div>

                <h3 className="font-serif font-black text-2xl text-[#2A2118] tracking-tight mt-2">
                  Feedback Submitted!
                </h3>
                <p className="text-sm text-[#5e4b3c] font-light max-w-xs leading-relaxed">
                  Thank you! Your ratings have been recorded. We hope to serve you again soon!
                </p>

                <span className="text-[10px] text-zinc-500 font-mono tracking-widest mt-4 block border border-[#ebdcc8] px-3 py-1 rounded-md bg-[#fdfaf5] uppercase font-bold">
                  Receipt Stamped
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
