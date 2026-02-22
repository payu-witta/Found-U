"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ImageUpload } from "./image-upload";
import { usePostFoundItem } from "@/lib/hooks/use-items";
import { analyzeImage } from "@/lib/api/ai";
import { BUILDINGS, CATEGORIES } from "@/lib/constants";
import type { VisionAnalysis, ItemCategory, FoundMode } from "@/lib/types";

const categoryOptions = Object.entries(CATEGORIES).map(([value, { label }]) => ({
  value,
  label,
}));

const buildingOptions = BUILDINGS.map((b) => ({ value: b, label: b }));

export function FoundItemForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [dateFound, setDateFound] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [foundMode, setFoundMode] = useState<FoundMode>("left_at_location");
  const [contactEmail, setContactEmail] = useState("");

  const postMutation = usePostFoundItem();

  async function handleImageSelected(file: File) {
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    if (!image) return;
    setAnalyzing(true);
    try {
      const result = await analyzeImage(image);
      setAnalysis(result);
      setTitle(result.title);
      setDescription(result.description);
      setCategory(result.category);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`AI analysis failed: ${msg}`);
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!image) return;
    try {
      await postMutation.mutateAsync({
        image,
        title,
        description,
        category: category as ItemCategory,
        location,
        date_occurred: dateFound,
        found_mode: foundMode,
        contact_email: foundMode === "keeping" ? contactEmail : undefined,
      });
      toast.success("Found item posted!");
      router.push("/feed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to post: ${msg}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex gap-1">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-brand-700" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="mb-1 text-xl font-bold text-gray-900">
              Found Something?
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Snap a quick photo — it takes under 5 seconds
            </p>
            <ImageUpload
              onImageSelect={handleImageSelected}
              preview={preview}
              onClear={() => {
                setImage(null);
                setPreview(null);
              }}
            />
            <Button
              className="mt-4 w-full"
              disabled={!image}
              onClick={() => {
                setStep(1);
                handleAnalyze();
              }}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
              <Sparkles className="h-8 w-8 animate-pulse text-brand-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Analyzing Item
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              AI is identifying the item and matching it with lost reports...
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep(0)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
                {analysis && (
                  <p className="text-xs text-brand-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI-generated — edit as needed
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Found mode toggle */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  What did you do with it?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFoundMode("left_at_location")}
                    className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                      foundMode === "left_at_location"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Left at Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoundMode("keeping")}
                    className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                      foundMode === "keeping"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    I&apos;m Keeping It Safe
                  </button>
                </div>
              </div>

              {foundMode === "keeping" && (
                <Input
                  id="contactEmail"
                  label="Your Contact Email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@umass.edu"
                  error={
                    foundMode === "keeping" && !contactEmail
                      ? "Required when keeping the item"
                      : undefined
                  }
                />
              )}

              <Input
                id="title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Black AirPods Pro"
              />
              <TextArea
                id="description"
                label="Description (required)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item you found (e.g., colors, brand, distinctive features...)"
                error={description.length > 0 && description.length < 10 ? "At least 10 characters" : undefined}
              />
              <Select
                id="category"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
                placeholder="Select category"
              />
              <Select
                id="location"
                label="Where did you find it?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                options={buildingOptions}
                placeholder="Select building"
              />
              <Input
                id="dateFound"
                label="Date Found"
                type="date"
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={handleSubmit}
                loading={postMutation.isPending}
                disabled={
                  !title ||
                  !description ||
                  description.length < 10 ||
                  !category ||
                  !location ||
                  (foundMode === "keeping" && !contactEmail)
                }
              >
                <Check className="mr-2 h-4 w-4" />
                Post Found Item
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
