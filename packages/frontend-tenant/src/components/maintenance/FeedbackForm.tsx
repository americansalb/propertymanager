'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating, StarRatingDisplay } from '@/components/ui/star-rating';

interface FeedbackFormProps {
  maintenanceRequestId: string;
  existingFeedback?: {
    overallRating: number;
    qualityRating: number | null;
    timelinessRating: number | null;
    communicationRating: number | null;
    comment: string | null;
    wouldRecommend: boolean | null;
    issueResolved: boolean;
    followUpRequested: boolean;
  } | null;
  onSuccess?: () => void;
}

export function FeedbackForm({
  maintenanceRequestId,
  existingFeedback,
  onSuccess,
}: FeedbackFormProps) {
  const queryClient = useQueryClient();
  const [overallRating, setOverallRating] = useState(existingFeedback?.overallRating || 0);
  const [qualityRating, setQualityRating] = useState(existingFeedback?.qualityRating || 0);
  const [timelinessRating, setTimelinessRating] = useState(existingFeedback?.timelinessRating || 0);
  const [communicationRating, setCommunicationRating] = useState(
    existingFeedback?.communicationRating || 0,
  );
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(
    existingFeedback?.wouldRecommend ?? null,
  );
  const [issueResolved, setIssueResolved] = useState(existingFeedback?.issueResolved ?? true);
  const [followUpReason, setFollowUpReason] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingFeedback);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingFeedback) {
        await api.put(`/tenant-portal/maintenance/${maintenanceRequestId}/feedback`, data);
      } else {
        await api.post(`/tenant-portal/maintenance/${maintenanceRequestId}/feedback`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-request', maintenanceRequestId] });
      setSubmitted(true);
      onSuccess?.();
    },
  });

  const followUpMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/tenant-portal/maintenance/${maintenanceRequestId}/follow-up`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setShowFollowUp(false);
    },
  });

  const handleSubmit = () => {
    if (overallRating === 0) {
      return;
    }

    submitMutation.mutate({
      overallRating,
      qualityRating: qualityRating || undefined,
      timelinessRating: timelinessRating || undefined,
      communicationRating: communicationRating || undefined,
      comment: comment || undefined,
      wouldRecommend,
      issueResolved,
      followUpRequested: !issueResolved,
      followUpReason: !issueResolved ? 'Issue not fully resolved' : undefined,
    });
  };

  const handleFollowUp = () => {
    if (!followUpReason.trim()) {
      return;
    }
    followUpMutation.mutate(followUpReason);
  };

  if (submitted && !showFollowUp) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Thank you for your feedback!</p>
              <p className="text-sm text-green-700">
                Your feedback helps us improve our maintenance service.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Your rating:</span>
                <StarRatingDisplay value={overallRating} size="sm" showValue={false} />
              </div>
              {!existingFeedback?.followUpRequested && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFollowUp(true)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Request Follow-up
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showFollowUp) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Request Follow-up
          </CardTitle>
          <CardDescription>
            If the issue wasn&apos;t fully resolved, let us know and we&apos;ll create a follow-up
            request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followUpReason">What still needs to be addressed?</Label>
            <Textarea
              id="followUpReason"
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              placeholder="Please describe what still needs to be fixed..."
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleFollowUp}
              disabled={!followUpReason.trim() || followUpMutation.isPending}
            >
              {followUpMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit Follow-up Request
            </Button>
            <Button variant="outline" onClick={() => setShowFollowUp(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {existingFeedback ? 'Update Your Feedback' : 'Rate This Service'}
        </CardTitle>
        <CardDescription>
          Help us improve by sharing your experience with this maintenance request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-2">
          <Label>Overall Rating *</Label>
          <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
          {overallRating === 0 && <p className="text-sm text-gray-500">Click a star to rate</p>}
        </div>

        {/* Issue Resolved */}
        <div className="space-y-2">
          <Label>Was the issue fully resolved?</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={issueResolved ? 'default' : 'outline'}
              onClick={() => setIssueResolved(true)}
              className={issueResolved ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              type="button"
              variant={!issueResolved ? 'default' : 'outline'}
              onClick={() => setIssueResolved(false)}
              className={!issueResolved ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
        </div>

        {/* Detailed Ratings */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm">Quality of Work</Label>
            <StarRating value={qualityRating} onChange={setQualityRating} size="md" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Timeliness</Label>
            <StarRating value={timelinessRating} onChange={setTimelinessRating} size="md" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Communication</Label>
            <StarRating value={communicationRating} onChange={setCommunicationRating} size="md" />
          </div>
        </div>

        {/* Would Recommend */}
        <div className="space-y-2">
          <Label>Would you recommend this service?</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={wouldRecommend === true ? 'default' : 'outline'}
              onClick={() => setWouldRecommend(true)}
              size="sm"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              type="button"
              variant={wouldRecommend === false ? 'default' : 'outline'}
              onClick={() => setWouldRecommend(false)}
              size="sm"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Additional Comments (Optional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share any additional thoughts about the service..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={overallRating === 0 || submitMutation.isPending}
          className="w-full sm:w-auto"
        >
          {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}
