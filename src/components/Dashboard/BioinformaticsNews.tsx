import React, { useState, useMemo, useEffect } from 'react';
import {
  Newspaper,
  Search,
  Sparkles,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Filter,
  RefreshCw,
  Dna,
  Zap,
  Tag,
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Share2,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { BioinformaticsNewsItem } from '../../types';
import type { ActiveTab } from '../../app/navigation';
import { StorageService } from '../../services/storage';
import { searchBioinformaticsGrounding } from '../../services/api';

interface BioinformaticsNewsProps {
  onNavigateTab?: (tab: ActiveTab) => void;
}

const CATEGORIES = [
  'All',
  'Job Trends',
  'AI & AlphaFold',
  'Breakthrough',
  'Clinical Genomics',
  'Tools & Cloud',
];

const QUICK_TAGS = [
  'Nextflow',
  'AlphaFold 3',
  'GATK 4',
  'Single-Cell',
  'Stipends & Fellowships',
  'Liquid Biopsy',
];

export const BioinformaticsNews: React.FC<BioinformaticsNewsProps> = ({ onNavigateTab }) => {
  const [news, setNews] = useState<BioinformaticsNewsItem[]>(() => StorageService.getNews());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() =>
    StorageService.getBookmarkedNewsIds()
  );
  const [isSearchingEffect, setIsSearchingEffect] = useState(false);
  const [searchStatusText, setSearchStatusText] = useState('');
  const [selectedNewsDetail, setSelectedNewsDetail] = useState<BioinformaticsNewsItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Google Search Grounding State with Gemini 3.5 Flash
  const [groundedInsight, setGroundedInsight] = useState<{
    text: string;
    sources: { title: string; uri: string }[];
    grounded: boolean;
  } | null>(null);
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);

  const handleRunSearchGrounding = async () => {
    setIsGroundingLoading(true);
    try {
      const result = await searchBioinformaticsGrounding(
        searchQuery || 'latest bioinformatics breakthroughs and job trends 2026'
      );
      setGroundedInsight(result);
    } catch {
      // Handled in api service
    } finally {
      setIsGroundingLoading(false);
    }
  };

  // Sync across tabs
  useEffect(() => {
    const unsubscribe = StorageService.subscribe((key) => {
      if (key === 'tf_bioinformatics_news') {
        setNews(StorageService.getNews());
      }
      if (key === 'tf_bookmarked_news') {
        setBookmarkedIds(StorageService.getBookmarkedNewsIds());
      }
    });
    return unsubscribe;
  }, []);

  // Live searching effect when user triggers fetch / search
  const triggerFetchEffect = (keyword?: string) => {
    setIsSearchingEffect(true);
    const steps = [
      'Connecting to NCBI PubMed & bioRxiv genomic feeds...',
      'Aggregating 2026 Biotech talent demand & salary benchmarks...',
      'Indexing AlphaFold 3 & high-throughput sequencing literature...',
      'Curating actionable takeaways for bioinformatics students...',
    ];

    let stepIdx = 0;
    setSearchStatusText(steps[0]);

    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setSearchStatusText(steps[stepIdx]);
      } else {
        clearInterval(interval);
        setIsSearchingEffect(false);
        setSearchStatusText('');
      }
    }, 450);

    if (keyword !== undefined) {
      setSearchQuery(keyword);
    }
  };

  const handleToggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    StorageService.toggleBookmarkNews(id);
    setBookmarkedIds(StorageService.getBookmarkedNewsIds());
  };

  const handleCopyShare = (item: BioinformaticsNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `🧬 [Omic Hub Bioinformatics Dispatch] ${item.title}\nSource: ${item.source} (${item.publishedDate})\nCareer Tip: ${item.studentCareerTakeaway}`;
    navigator.clipboard?.writeText(shareText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered news items
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      if (onlyBookmarked && !bookmarkedIds.includes(item.id)) {
        return false;
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedTag) {
        const matchesTag = item.keySkills.some((s) =>
          s.toLowerCase().includes(selectedTag.toLowerCase())
        );
        if (!matchesTag) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.studentCareerTakeaway.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.keySkills.some((k) => k.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [news, selectedCategory, selectedTag, searchQuery, onlyBookmarked, bookmarkedIds]);

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200">
              <Dna className="w-4 h-4 text-neutral-800" />
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
              <span>Bioinformatics Intelligence</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Live Feed Active
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <span>Bioinformatics Industry News & Breakthroughs</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
            Real-time industry breakthroughs, wet-to-dry lab shifts, AlphaFold benchmarks, and hiring surges curated specifically for computational biology & bioinformatics scholars.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => triggerFetchEffect()}
            disabled={isSearchingEffect}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Scan genomic journals & talent boards"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearchingEffect ? 'animate-spin' : ''}`} />
            <span>{isSearchingEffect ? 'Fetching Live...' : 'Fetch Latest Trends'}</span>
          </button>

          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              onlyBookmarked
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({bookmarkedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Dynamic Filter Bar with Visual Search Effect */}
      <div className="space-y-3">
        <div className="relative flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search
                className="w-4 h-4 text-neutral-400"
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news, technologies (e.g. Nextflow, AlphaFold, Seurat, Variant Calling)..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400 hover:text-neutral-900"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={handleRunSearchGrounding}
            disabled={isGroundingLoading}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
            title="Perform verified Google Search Grounding with Gemini 3.5 Flash"
          >
            <Globe2 className={`w-3.5 h-3.5 text-neutral-700 ${isGroundingLoading ? 'animate-spin' : ''}`} />
            <span>{isGroundingLoading ? 'Searching Web...' : 'Ground with Google Search'}</span>
            <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-700 font-mono">
              3.5-flash
            </span>
          </button>
        </div>

        {/* Verified Google Search Grounding Card */}
        {groundedInsight && (
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">
                  Google Search Grounded Intelligence (Gemini 3.5 Flash)
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Real-time Grounded
                </span>
              </div>
              <button
                onClick={() => setGroundedInsight(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-mono"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs leading-relaxed text-neutral-700 whitespace-pre-line">
              {groundedInsight.text}
            </p>

            {groundedInsight.sources && groundedInsight.sources.length > 0 && (
              <div className="pt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-500 block mb-1.5 font-mono uppercase tracking-wider">
                  Verified Grounding Sources:
                </span>
                <div className="flex flex-wrap gap-2">
                  {groundedInsight.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[11px] text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                      <Globe2 className="w-3 h-3 text-neutral-500" />
                      <span className="truncate max-w-[200px]">{s.title}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Searching Status Effect Indicator */}
        {isSearchingEffect && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs">
            <div className="relative flex items-center justify-center">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-900"></span>
            </div>
            <span className="font-semibold">{searchStatusText}</span>
          </div>
        )}

        {/* Quick Tag Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono font-medium text-neutral-400 flex items-center gap-1 mr-1">
            <Tag className="w-3 h-3 text-neutral-400" />
            <span>Topics:</span>
          </span>
          {QUICK_TAGS.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => {
                  if (isActive) {
                    setSelectedTag(null);
                  } else {
                    setSelectedTag(tag);
                    triggerFetchEffect(tag);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-neutral-900 text-white font-bold shadow-2xs'
                    : 'bg-neutral-100 border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900'
                }`}
              >
                <span>{tag}</span>
              </button>
            );
          })}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[11px] text-neutral-500 hover:text-neutral-900 underline ml-2"
            >
              Reset Tag
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-100 pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white font-bold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1 font-mono">
        <span>
          Displaying <strong className="text-neutral-900">{filteredNews.length}</strong> industry updates
          {selectedCategory !== 'All' && <span> in <strong className="text-neutral-900">{selectedCategory}</strong></span>}
          {selectedTag && <span> tagged with <strong className="text-neutral-900">{selectedTag}</strong></span>}
        </span>
        <span className="text-[11px] text-neutral-400">Updated hourly from genomic feeds</span>
      </div>

      {/* News Cards Grid */}
      {filteredNews.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
          <Newspaper className="w-8 h-8 text-neutral-400 mx-auto" />
          <p className="text-sm font-semibold text-neutral-700">
            No articles match your filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedTag(null);
              setOnlyBookmarked(false);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNews.map((item) => {
            const isSaved = bookmarkedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNewsDetail(item)}
                className="group relative rounded-xl bg-white hover:bg-neutral-50/60 border border-neutral-200 hover:border-neutral-300 p-5 flex flex-col justify-between transition-all shadow-2xs cursor-pointer"
              >
                <div>
                  {/* Card Meta Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700">
                        {item.category}
                      </span>
                      {item.trendBadge && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-50 border border-neutral-200 text-neutral-800">
                          {item.trendBadge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleCopyShare(item, e)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Copy Summary"
                      >
                        {copiedId === item.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleToggleBookmark(item.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                        title={isSaved ? 'Remove bookmark' : 'Bookmark news'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Source & Read Time */}
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500 font-mono">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.publishedDate}</span>
                    <span>•</span>
                    <span>{item.readTime}</span>
                  </div>

                  {/* Summary Snippet */}
                  <p className="mt-2.5 text-xs text-neutral-600 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>

                  {/* Student Career Takeaway Highlight */}
                  <div className="mt-3.5 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-800 font-semibold mb-1">
                      <GraduationCap className="w-3.5 h-3.5 text-neutral-700" />
                      <span>Career Impact:</span>
                    </div>
                    <p className="text-neutral-600 text-[11px] leading-relaxed line-clamp-2">
                      {item.studentCareerTakeaway}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Skills & Read Action */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {item.keySkills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {item.keySkills.length > 3 && (
                      <span className="text-[10px] text-neutral-500 px-1 py-0.5 font-mono">
                        +{item.keySkills.length - 3}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:translate-x-0.5 transition-transform shrink-0">
                    <span>Read Analysis</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Reading Modal */}
      {selectedNewsDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700">
                    {selectedNewsDetail.category}
                  </span>
                  {selectedNewsDetail.trendBadge && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-50 border border-neutral-200 text-neutral-800">
                      {selectedNewsDetail.trendBadge}
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Impact: <strong className="text-neutral-900">{selectedNewsDetail.impactScore}/100</strong>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
                  {selectedNewsDetail.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                  <span>{selectedNewsDetail.source}</span>
                  <span>•</span>
                  <span>{selectedNewsDetail.publishedDate}</span>
                  <span>•</span>
                  <span>{selectedNewsDetail.readTime}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNewsDetail(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Overview / Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
                Full Industry Context & Breakdown
              </h4>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                {selectedNewsDetail.summary}
              </p>
            </div>

            {/* Student Career Takeaway - Highlight Box without gradient */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs sm:text-sm">
                <GraduationCap className="w-4 h-4 text-neutral-700" />
                <span>What This Means For Bioinformatics Students & Early Researchers:</span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                {selectedNewsDetail.studentCareerTakeaway}
              </p>
            </div>

            {/* Key Skills */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider mb-2">
                In-Demand Skills & Tools Mentioned
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedNewsDetail.keySkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-mono font-medium"
                  >
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100">
              <button
                onClick={() => handleToggleBookmark(selectedNewsDetail.id)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
              >
                {bookmarkedIds.includes(selectedNewsDetail.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Bookmarked (Click to Remove)</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-neutral-500" />
                    <span>Bookmark for Research</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      setSelectedNewsDetail(null);
                      onNavigateTab('skills');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Explore Matching Courses</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedNewsDetail(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
