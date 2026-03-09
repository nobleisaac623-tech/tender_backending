import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface AIDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionData: {
    action: string;
    data: Record<string, unknown>;
    message: string;
  } | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export function AIDraftModal({ isOpen, onClose, actionData, onConfirm, isLoading }: AIDraftModalProps) {
  if (!isOpen || !actionData || !actionData.data) return null;

  const fields = Object.entries(actionData.data).filter(([_, v]) => v !== null && v !== '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[80vh] overflow-auto">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span>✨ AI Suggestion</span>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {actionData.action === 'draft_tender' ? 'Create Tender' : 'Submit Bid'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <p className="text-gray-700">{actionData.message}</p>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            {fields.length > 0 ? fields.map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="text-gray-800">{String(value)}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-center">No data available</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
