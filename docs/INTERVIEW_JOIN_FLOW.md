## Interview Join Flow

- Admin creates an interview → status starts as `pending`.  
- Student sees the interview in dashboard as pending.  
- When student clicks **Join Interview**, backend marks it `in_progress` and exposes questions.  
- Frontend only loads questions when interview is `in_progress` or `completed`.  


