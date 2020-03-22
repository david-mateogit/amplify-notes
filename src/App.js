import React, { useState, useEffect } from "react";
import { API, Auth, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { createNote, updateNote, deleteNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
} from "./graphql/subscriptions";
import Loading from "./components/loading/loader";

function App() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchAllNotes = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const result = await API.graphql(graphqlOperation(listNotes));
      const allNotes = result.data.listNotes.items;
      setNotes(allNotes);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsError(true);
    }
  };

  const handleChange = event => setNote(event.target.value);

  const hasExistingNote = () => {
    if (noteId) {
      const isNote = notes.findIndex(item => item.id === noteId) > -1;
      return isNote;
    }
    return false;
  };

  const handleCreateNote = async input => {
    setIsLoading(true);
    await API.graphql(graphqlOperation(createNote, { input }));
  };

  const handleUpdateNote = async input => {
    setIsLoading(true);
    await API.graphql(graphqlOperation(updateNote, { input }));
  };

  const handleDelete = async id => {
    setIsLoading(true);
    try {
      await API.graphql(graphqlOperation(deleteNote, { input: { id } }));
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setIsError(true);
    }
  };

  const handleSetNote = ({ note: text, id: identifier }) => {
    setNote(text);
    setNoteId(identifier);
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const input = {
      note,
      id: noteId,
    };
    if (note.length <= 2) return;
    try {
      if (hasExistingNote()) {
        await handleUpdateNote(input);
      } else {
        await handleCreateNote(input);
      }
      setNote("");
      setNoteId("");
    } catch (error) {
      setIsLoading(false);
      console.error(error);
      setIsError(true);
    }
  };

  const clearInput = () => {
    setNote("");
    setNoteId("");
  };

  const createNoteListener = async () => {
    await API.graphql(
      graphqlOperation(onCreateNote, {
        owner: (await Auth.currentUserInfo()).username,
      })
    ).subscribe({
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote;
        setNotes(prevNotes => {
          const oldNotes = prevNotes.filter(item => item.id !== newNote.id);
          const updatedNotes = [newNote, ...oldNotes];
          return updatedNotes;
        });
        setIsLoading(false);
      },
    });
  };

  const deleteNoteListener = async () => {
    await API.graphql(
      graphqlOperation(onDeleteNote, {
        owner: (await Auth.currentUserInfo()).username,
      })
    ).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote;
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.filter(
            item => item.id !== deletedNote.id
          );
          return updatedNotes;
        });
        setIsLoading(false);
      },
    });
  };

  const updateNoteListener = async () => {
    API.graphql(
      graphqlOperation(onUpdateNote, {
        owner: (await Auth.currentUserInfo()).username,
      })
    ).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote;

        setNotes(prevNotes => {
          const index = prevNotes.findIndex(item => item.id === updatedNote.id);

          const updatedNotes = [
            ...prevNotes.slice(0, index),
            updatedNote,
            ...prevNotes.slice(index + 1),
          ];
          return updatedNotes;
        });
        setIsLoading(false);
      },
    });
  };

  useEffect(() => {
    fetchAllNotes();
    createNoteListener();
    deleteNoteListener();
    updateNoteListener();

    return () => {
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex flex-column items-center justify-center pa3 .bg-light-yellow">
      <h1 className="code f2-l">AWS Amplify Notes</h1>
      <form onSubmit={handleSubmit} className="mb3 flex">
        <div className="ba flex items-center justify-between bg-white">
          <input
            type="text"
            name="note"
            id="note-input"
            className="pa2 f4 bn outline-0"
            placeholder="Write your note"
            autoComplete="off"
            onChange={handleChange}
            value={note}
            // required
          />

          <button
            type="button"
            className={`${note ? "o-100 " : "o-0"} mr1 ml1`}
            onClick={clearInput}
          >
            🅧
          </button>
        </div>

        <button type="submit" className="pa2 f5 submit bg-light-green">
          {hasExistingNote() ? "Update Note" : "Add Note"}
        </button>
      </form>
      {isError && <div>Something went wrong ...</div>}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="bg-yellow pa3 mw6 w-30">
          {notes.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between bb "
            >
              <li className="list pa1 f3" onClick={() => handleSetNote(item)}>
                {item.note}
              </li>
              <button
                className="bg-transparent bn f4"
                type="button"
                onClick={() => handleDelete(item.id)}
              >
                <span>&times;</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
