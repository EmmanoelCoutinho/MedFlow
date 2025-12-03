import React from 'react';
import { Tag } from '../../types';
import { Badge } from '../ui/Badge';
interface TagFilterProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}
export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onChange
}) => {
  const tags: Tag[] = ['Pacientes', 'Médicos', 'Vendas', 'Suporte'];
  const toggleTag = (tag: Tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };
  return <div>
      <label className="text-xs font-medium text-gray-600 mb-2 block">
        Etiquetas
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => <button key={tag} onClick={() => toggleTag(tag)} className={`transition-opacity ${selectedTags.includes(tag) ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}>
            <Badge variant="tag" tag={tag}>
              {tag}
            </Badge>
          </button>)}
      </div>
    </div>;
};