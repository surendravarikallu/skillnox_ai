"""
Utility to convert Kaggle datasets into our fine-tune JSONL format.

This script does NOT download from Kaggle itself. First download the datasets
manually (or via kaggle/kagglehub) into the `datasets/` folder, then run:

  cd python-ai
  python utils/kaggle_to_finetune.py \
    --resume_csv datasets/resume_dataset.csv \
    --qa_csv datasets/tester_interview_qa.csv \
    --output datasets/fine_tune_samples.jsonl

It will append new samples to the existing fine_tune_samples.jsonl file
if it already exists.
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, Any, Iterable


def read_existing_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
  if not path.exists():
    return []
  with path.open("r", encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      try:
        yield json.loads(line)
      except json.JSONDecodeError:
        continue


def convert_resume_csv(csv_path: Path) -> Iterable[Dict[str, Any]]:
  """
  Convert rows from snehaanbhawal/resume-dataset (or similar) into
  `type: resume_analysis` samples.

  We assume the CSV has at least:
    - a text column (e.g. 'Resume', 'Resume_str')
    - an optional category label (e.g. 'Category')
  """
  if not csv_path.exists():
    return []

  samples = []
  with csv_path.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
      # Try a few common column names
      resume_text = (
        row.get("Resume") or
        row.get("resume") or
        row.get("Resume_str") or
        row.get("text") or
        ""
      ).strip()

      if not resume_text:
        continue

      category = (row.get("Category") or row.get("category") or "").strip()

      sample: Dict[str, Any] = {
        "type": "resume_analysis",
        "resume_text": resume_text,
        # category is optional context for the LLM
        "jd_text": f"Target role category: {category}" if category else None,
        # Placeholder labels – you can later refine these manually or with rules
        "score": 70,
        "strengths": [
          "Relevant experience for the stated category" if category else "Shows practical experience"
        ],
        "suggestions": [
          "Add quantifiable achievements (metrics, impact) to each role.",
          "Highlight the most important technical skills near the top.",
          "Ensure formatting is consistent and easy to scan.",
          "Include links to portfolio, GitHub, or relevant profiles."
        ],
        "improvements": [
          "Clarify responsibilities and ownership for each project."
        ],
        "skills": []
      }
      samples.append(sample)

  return samples


def convert_qa_csv(csv_path: Path) -> Iterable[Dict[str, Any]]:
  """
  Convert rows from an interview Q&A dataset like
  timno1/tester-interview-questions-and-answers into
  `type: interview_eval` samples.

  We assume the CSV has at least:
    - 'Question' column
    - 'Answer' or 'Sample Answer' column
  """
  if not csv_path.exists():
    return []

  samples = []
  with csv_path.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
      question = (
        row.get("Question") or
        row.get("question") or
        row.get("Questions") or
        ""
      ).strip()

      answer = (
        row.get("Answer") or
        row.get("Sample Answer") or
        row.get("answer") or
        ""
      ).strip()

      if not question or not answer:
        continue

      # Very simple heuristic label: longer answers get slightly higher default score.
      length = len(answer.split())
      base_score = 60
      if length > 80:
        base_score = 85
      elif length > 40:
        base_score = 75

      feedback = (
        "Good coverage of the main idea. "
        "You can further improve by adding a concrete example and mentioning specific tools or metrics."
      )

      samples.append(
        {
          "type": "interview_eval",
          "question": question,
          "answer": answer,
          "score": base_score,
          "feedback": feedback,
        }
      )

  return samples


def main() -> None:
  parser = argparse.ArgumentParser(description="Convert Kaggle CSVs into fine-tune JSONL samples.")
  parser.add_argument(
    "--resume_csv",
    type=str,
    default="",
    help="Path to Kaggle resume CSV (e.g., snehaanbhawal/resume-dataset).",
  )
  parser.add_argument(
    "--qa_csv",
    type=str,
    default="",
    help="Path to Kaggle interview Q&A CSV (e.g., tester interview Q&A).",
  )
  parser.add_argument(
    "--output",
    type=str,
    default="datasets/fine_tune_samples.jsonl",
    help="Output JSONL file to append to.",
  )

  args = parser.parse_args()
  output_path = Path(args.output)

  existing = list(read_existing_jsonl(output_path))

  new_samples: list[Dict[str, Any]] = []
  if args.resume_csv:
    new_samples.extend(convert_resume_csv(Path(args.resume_csv)))
  if args.qa_csv:
    new_samples.extend(convert_qa_csv(Path(args.qa_csv)))

  all_samples = existing + new_samples

  with output_path.open("w", encoding="utf-8") as f:
    for obj in all_samples:
      # Drop None fields to keep lines clean
      clean_obj = {k: v for k, v in obj.items() if v is not None}
      f.write(json.dumps(clean_obj, ensure_ascii=False) + "\n")

  print(f"Appended {len(new_samples)} new samples. Total samples in {output_path}: {len(all_samples)}")


if __name__ == "__main__":
  main()


