import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Send, Loader2 } from 'lucide-react';
import { detectContactInfo, getViolationAction, getWarningMessage } from '@/lib/moderation';
import { useToast } from '@/components/ui/use-toast';

export default function CreatePost({ user, accessLevel = 'public', onPostCreated }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [postLevel, setPostLevel] = useState(accessLevel);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;
    
    // Check for contact info (unless admin)
    if (!isAdmin) {
      const check = detectContactInfo(content);
      if (check.hasContact) {
        const currentCount = (user?.violationCount || 0) + 1;
        const action = getViolationAction(user?.violationCount || 0);
        const warning = getWarningMessage(currentCount);
        
        toast({
          title: '⚠️ Conteúdo bloqueado',
          description: warning,
          variant: 'destructive',
        });
        
        return;
      }
    }

    setIsSubmitting(true);
    let imageUrl = null;
    
    try {
      if (imageFile) {
        toast({ title: 'Enviando imagem...', description: 'Aguarde um momento.' });
        const uploadRes = await api.uploadImage(imageFile);
        if (uploadRes?.data?.url) {
          imageUrl = uploadRes.data.url;
        }
      }
      
      await api.createPost({
        content: content.trim(),
        mediaUrls: imageUrl ? [imageUrl] : [],
        accessLevel: postLevel,
      });

      setContent('');
      setImageFile(null);
      setImagePreview(null);
      onPostCreated?.();
      
      toast({
        title: 'Post criado!',
        description: 'Seu post foi publicado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar post',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 border border-border shrink-0">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback className="bg-secondary text-sm">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Compartilhe algo com a comunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] bg-secondary/50 border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary/50"
          />
          
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="rounded-lg max-h-48 object-cover" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                ✕
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Image className="w-4 h-4" />
                  <span className="hidden sm:inline">Imagem</span>
                </div>
              </label>
              
              {isAdmin && (
                <Select value={postLevel} onValueChange={setPostLevel}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="mentored">Mentorados</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && !imageFile) || isSubmitting}
              size="sm"
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Publicar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}