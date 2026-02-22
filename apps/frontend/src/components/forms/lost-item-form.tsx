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
import { usePostLostItem } from "@/lib/hooks/use-items";
import { analyzeImage } from "@/lib/api/ai";
import { BUILDINGS, CATEGORIES } from "@/lib/constants";
import type { VisionAnalysis, ItemCategory } from "@/lib/types";
import { motionEase, motionTiming } from "@/lib/motion";

const categoryOptions = Object.entries(CATEGORIES).map(([value, { label }]) => ({
  value,
  label,
}));

const buildingOptions = BUILDINGS.map((b) => ({ value: b, label: b }));

export function LostItemForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [spireId, setSpireId] = useState("");
  const [location, setLocation] = useState("");
  const [dateLost, setDateLost] = useState(
    new Date().toISOString().split("T")[0]
  );

  const postMutation = usePostLostItem();

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
        spire_id: category === "ucard" ? spireId : undefined,
        location,
        date_occurred: dateLost,
      });
      toast.success("Lost item posted!");
      router.push("/feed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to post: ${msg}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-6 flex gap-1">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-brand-700 dark:bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: motionTiming.base, ease: motionEase.out }}
          >
            <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
              Upload a Photo
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Take or upload a photo of your lost item
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
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: motionTiming.base, ease: motionEase.out }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
              <Sparkles className="h-8 w-8 animate-pulse text-brand-700" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              Analyzing Your Item
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Our AI is identifying your item and generating a description...
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: motionTiming.base, ease: motionEase.out }}
          >
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep(0)}
                className="rounded-lg p-1 text-gray-400 transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Item Details</h2>
                {analysis && (
                  <p className="text-xs text-brand-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI-generated — edit as needed
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
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
                placeholder="Describe your item (e.g., colors, brand, distinctive features...)"
                error={description.length > 0 && description.length < 10 ? "At least 10 characters" : undefined}
              />
              <Select
                id="category"
                label="Category"
                value={category}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategory(next);
                  if (next !== "ucard") setSpireId("");
                }}
                options={categoryOptions}
                placeholder="Select category"
              />
              {category === "ucard" && (
                <Input
                  id="spireId"
                  label="SPIRE ID (required)"
                  value={spireId}
                  onChange={(e) => setSpireId(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="8-digit SPIRE ID"
                  inputMode="numeric"
                  error={spireId.length > 0 && spireId.length !== 8 ? "Must be exactly 8 digits" : undefined}
                />
              )}
              <Select
                id="location"
                label="Where did you lose it?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                options={buildingOptions}
                placeholder="Select building"
              />
              <Input
                id="dateLost"
                label="Date Lost"
                type="date"
                value={dateLost}
                onChange={(e) => setDateLost(e.target.value)}
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
                  (category === "ucard" && spireId.length !== 8)
                }
              >
                <Check className="mr-2 h-4 w-4" />
                Post Lost Item
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
