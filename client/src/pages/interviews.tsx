import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Brain,
  Calendar,
  Clock,
  Play,
  Eye,
  Plus,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { Interview } from "@shared/schema";

export default function InterviewsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  const filteredInterviews = interviews?.filter(interview => {
    const query = searchQuery.toLowerCase();
    return (
      interview.type.toLowerCase().includes(query) ||
      interview.company?.toLowerCase().includes(query) ||
      interview.status.toLowerCase().includes(query)
    );
  }) || [];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'hr': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'behavioral': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'company': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'gd': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'project': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Interview History</h1>
          <p className="text-muted-foreground">
            View and analyze all your past interview sessions
          </p>
        </div>
        <Link href="/interview/start">
          <Button data-testid="button-new-interview">
            <Plus className="w-4 h-4 mr-2" />
            New Interview
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">All Interviews</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search interviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredInterviews.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((interview) => (
                    <TableRow key={interview.id} data-testid={`row-interview-${interview.id}`}>
                      <TableCell>
                        <Badge className={getTypeColor(interview.type)}>
                          {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {interview.company || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(interview.createdAt!).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {interview.duration ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {Math.round(interview.duration / 60)} min
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {interview.overallScore !== null ? (
                          <span className="font-semibold">
                            {Math.round(interview.overallScore)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {interview.status === 'in_progress' ? (
                          <Link href={`/interview/${interview.id}/room`}>
                            <Button size="sm" data-testid={`button-continue-${interview.id}`}>
                              <Play className="w-4 h-4 mr-1" />
                              Continue
                            </Button>
                          </Link>
                        ) : interview.status === 'completed' ? (
                          <Link href={`/interview/${interview.id}/results`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-${interview.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/interview/${interview.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">
                {searchQuery ? 'No matching interviews' : 'No interviews yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'Start your first mock interview to begin practicing'
                }
              </p>
              {!searchQuery && (
                <Link href="/interview/start">
                  <Button data-testid="button-start-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Start First Interview
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {interviews && interviews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary" data-testid="text-stat-total">
                {interviews.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Interviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-500">
                {interviews.filter(i => i.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">
                {interviews.filter(i => i.status === 'completed').length > 0
                  ? Math.round(
                      interviews
                        .filter(i => i.status === 'completed' && i.overallScore !== null)
                        .reduce((acc, i) => acc + (i.overallScore || 0), 0) /
                      interviews.filter(i => i.status === 'completed' && i.overallScore !== null).length
                    )
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">
                {interviews.filter(i => i.type === 'company').length}
              </p>
              <p className="text-sm text-muted-foreground">Company Simulations</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
