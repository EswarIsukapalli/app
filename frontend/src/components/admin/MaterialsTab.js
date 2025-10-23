import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Upload, Trash2, Download, FileText, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MaterialsTab = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    type: 'note',
    file: null
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials`);
      setMaterials(response.data);
    } catch (error) {
      toast.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('title', uploadData.title);
    formData.append('type', uploadData.type);

    try {
      await axios.post(`${API}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Material uploaded successfully');
      setDialogOpen(false);
      setUploadData({ title: '', type: 'note', file: null });
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;

    try {
      await axios.delete(`${API}/materials/${materialId}`);
      toast.success('Material deleted');
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  return (
    <div data-testid="materials-section">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Learning Materials</h2>
          <p className="text-gray-600 mt-1">Upload and manage lecture notes and videos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="upload-material-btn">
              <Upload className="w-4 h-4 mr-2" />
              Upload Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Learning Material</DialogTitle>
              <DialogDescription>
                Share lecture notes or videos with your students
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  data-testid="material-title"
                  placeholder="e.g., Week 1 - Introduction"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup
                  value={uploadData.type}
                  onValueChange={(value) => setUploadData({ ...uploadData, type: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="note" id="note" data-testid="type-note" />
                    <Label htmlFor="note" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Lecture Note
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="video" id="video" data-testid="type-video" />
                    <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                      <Video className="w-4 h-4" />
                      Video Tutorial
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  data-testid="material-file"
                  type="file"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  required
                />
              </div>
              <Button
                type="submit"
                data-testid="upload-submit-btn"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No materials uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <Card key={material.id} className="card-hover" data-testid={`material-${material.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge
                      variant="secondary"
                      className={material.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                    >
                      {material.type === 'video' ? '🎥 Video' : '📄 Note'}
                    </Badge>
                    <CardTitle className="mt-2">{material.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                    data-testid={`delete-material-${material.id}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  {material.filename}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`${BACKEND_URL}${material.file_path}`, '_blank')}
                  data-testid={`view-material-${material.id}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  View File
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialsTab;