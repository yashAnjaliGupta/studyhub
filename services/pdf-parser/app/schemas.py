from typing import List, Optional, Dict, Any, Union, Literal
from pydantic import BaseModel, Field

QuestionType = Literal[
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "NUMERICAL",
    "INTEGER",
    "DECIMAL",
    "TEXT",
    "DESCRIPTIVE",
    "SHORT_ANSWER",
    "LONG_ANSWER",
    "ASSERTION_REASON",
    "MATCHING",
    "MATRIX_MATCH",
    "FILL_IN_THE_BLANK",
    "TRUE_FALSE",
    "PASSAGE_BASED",
    "COMPREHENSION",
    "SUBJECTIVE",
    "UNKNOWN",
    "OTHER"
]

ReviewStatus = Literal[
    "NOT_REVIEWED",
    "REVIEW_REQUIRED",
    "VERIFIED",
    "LOW_CONFIDENCE"
]

ContentBlockType = Literal[
    "text",
    "math",
    "image",
    "table",
    "diagram",
    "chemical_structure",
    "equation",
    "other"
]

AssetType = Literal[
    "image",
    "diagram",
    "table",
    "other"
]

class AssetRef(BaseModel):
    assetId: Optional[str] = None
    pageNumber: Optional[int] = None
    description: Optional[str] = None

class ContentBlock(BaseModel):
    type: Optional[ContentBlockType] = "text"
    value: Optional[str] = None
    assetId: Optional[str] = None
    format: Optional[str] = None # e.g. "latex", "markdown", "plain_text"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Option(BaseModel):
    id: Optional[str] = None
    label: Optional[Union[str, int]] = None
    text: Optional[str] = None
    imageUrl: Optional[str] = None
    content: List[ContentBlock] = Field(default_factory=list)
    images: List[AssetRef] = Field(default_factory=list)
    isCorrect: Optional[bool] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Question(BaseModel):
    id: Optional[str] = None
    number: Optional[Union[int, str]] = None
    type: Optional[QuestionType] = "SINGLE_CHOICE"
    question: Optional[str] = None
    questionParts: List[ContentBlock] = Field(default_factory=list)
    options: List[Option] = Field(default_factory=list)
    passage: Optional[str] = None
    instructions: List[str] = Field(default_factory=list)
    marks: Optional[float] = None
    negativeMarks: Optional[float] = None
    answer: Optional[Union[str, float, int, bool, List[Any]]] = None
    answerType: Optional[str] = None
    correctOptionIds: List[str] = Field(default_factory=list)
    numericalAnswer: Optional[Dict[str, Any]] = None
    solutionText: Optional[str] = None
    solutionSvg: Optional[str] = None
    suggestedTopic: Optional[str] = None
    images: List[AssetRef] = Field(default_factory=list)
    imageUrl: Optional[str] = None
    diagramSvg: Optional[str] = None
    sourcePages: List[int] = Field(default_factory=list)
    sourceQuestionNumber: Optional[str] = None
    subject: Optional[str] = None
    confidence: Optional[float] = None
    reviewStatus: Optional[ReviewStatus] = "NOT_REVIEWED"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Section(BaseModel):
    number: Optional[Union[int, str]] = None
    title: Optional[str] = None
    code: Optional[str] = None
    instructions: List[str] = Field(default_factory=list)
    questionType: Optional[QuestionType] = None
    maximumMarks: Optional[float] = None
    marksPerQuestion: Optional[float] = None
    negativeMarks: Optional[float] = None
    questions: List[Question] = Field(default_factory=list)
    sourcePages: List[int] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Subject(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    instructions: List[str] = Field(default_factory=list)
    maximumMarks: Optional[float] = None
    sections: List[Section] = Field(default_factory=list)
    questions: List[Question] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Exam(BaseModel):
    name: Optional[str] = None
    examType: Optional[str] = None
    year: Optional[int] = None
    paper: Optional[str] = None
    paperCode: Optional[str] = None
    language: Optional[str] = None
    sourceFile: Optional[str] = None
    durationMinutes: Optional[int] = None
    maximumMarks: Optional[float] = None
    totalQuestions: Optional[int] = None
    sourcePages: List[int] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Asset(BaseModel):
    id: Optional[str] = None
    type: Optional[AssetType] = "diagram"
    url: Optional[str] = None
    pageNumber: Optional[int] = None
    description: Optional[str] = None
    bbox: Optional[List[float]] = None # [x0, y0, x1, y1]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ExamPaper(BaseModel):
    schemaVersion: str = "1.0"
    exam: Exam
    subjects: List[Subject] = Field(default_factory=list)
    sections: List[Section] = Field(default_factory=list)
    questions: List[Question] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)
    assets: List[Asset] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Endpoint Request & Response DTOs
class ParseRequest(BaseModel):
    pdfPath: Optional[str] = None
    pdfUrl: Optional[str] = None
    paperId: Optional[str] = None
    paperTitle: Optional[str] = None
    examName: Optional[str] = None   # Human-readable exam name (e.g. "JEE Advanced 2023 Paper 1")
    examType: Optional[str] = None   # e.g. "JEE_Advanced", "JEE_Main", "NEET"
    year: Optional[int] = None
    subject: Optional[str] = None

class ParseResponse(BaseModel):
    success: bool
    paper: Optional[ExamPaper] = None
    errors: List[str] = Field(default_factory=list)
    processingTimeMs: float = 0.0
    detectedLayout: Optional[Dict[str, Any]] = None
    plannerBlueprint: Optional[Dict[str, Any]] = None
    generatedPdfPath: Optional[str] = None
    debugJsonPath: Optional[str] = None

# Backward-compatible type aliases
PaperSchema = ExamPaper
QuestionSchema = Question
OptionSchema = Option
SectionSchema = Section
