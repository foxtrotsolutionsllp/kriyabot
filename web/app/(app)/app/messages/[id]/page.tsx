import { MessagesWorkspace } from "@/components/MessagesWorkspace";
export default async function ConversationPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <MessagesWorkspace conversationId={Number(id)}/>;}
