'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BoardDetail, CreateLabelInput, UpdateLabelInput, SetCardLabelsInput } from '@kompak/shared';
import * as api from '@/lib/api/labels';
import { boardKey } from './hooks';
import { replaceCardInBoard } from './board-cache';
export function useCreateLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: CreateLabelInput) => api.createLabel(boardId, input), onSuccess: (label) => qc.setQueryData<BoardDetail>(boardKey(boardId), (board) => board && !board.labels.some((l) => l.id === label.id) ? {...board, labels: [...board.labels, label]} : board) });
}
export function useUpdateLabel(boardId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({id,input}: {id:string; input:UpdateLabelInput}) => api.updateLabel(id,input), onSuccess: (label) => qc.setQueryData<BoardDetail>(boardKey(boardId), (board) => board ? {...board, labels: board.labels.map((l)=>l.id===label.id?label:l)} : board) });
}
export function useDeleteLabel(boardId: string) {
  const qc=useQueryClient();
  return useMutation({ mutationFn: (id:string)=>api.deleteLabel(id), onSuccess: (_result,id)=>qc.setQueryData<BoardDetail>(boardKey(boardId),(board)=>board?{...board,labels:board.labels.filter(l=>l.id!==id),lists:board.lists.map(list=>({...list,cards:list.cards.map(card=>({...card,labelIds:card.labelIds.filter(labelId=>labelId!==id)}))}))}:board) });
}
export function useSetCardLabels(boardId: string) {
  const qc=useQueryClient();
  return useMutation({ mutationFn: ({cardId,input}: {cardId:string;input:SetCardLabelsInput})=>api.setCardLabels(cardId,input), onSuccess:card=>qc.setQueryData<BoardDetail>(boardKey(boardId),board=>board?replaceCardInBoard(board,card):board) });
}