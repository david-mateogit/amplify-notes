import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { createNote, updateNote, deleteNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";

function App() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState("");

  const fetchAllNotes = async () => {
    try {
      const result = await API.graphql(graphqlOperation(listNotes));
      const allNotes = result.data.listNotes.items;
      setNotes(allNotes);
    } catch (error) {
      console.error(error);
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
    const result = await API.graphql(graphqlOperation(createNote, { input }));
    const newNote = result.data.createNote;
    setNotes([newNote, ...notes]);
  };

  const handleUpdateNote = async input => {
    const result = await API.graphql(graphqlOperation(updateNote, { input }));
    const updatedNote = result.data.updateNote;
    const index = notes.findIndex(item => item.id === noteId);
    const newNotes = [
      ...notes.slice(0, index),
      updatedNote,
      ...notes.slice(index + 1),
    ];
    setNotes(newNotes);
  };

  const handleDelete = async id => {
    try {
      const result = await API.graphql(
        graphqlOperation(deleteNote, { input: { id } })
      );
      const deletedNote = result.data.deleteNote.id;
      const filteredNotes = notes.filter(item => item.id !== deletedNote);
      setNotes(filteredNotes);
    } catch (error) {
      console.error(error);
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

    try {
      if (hasExistingNote()) {
        await handleUpdateNote(input);
      } else {
        await handleCreateNote(input);
      }
      setNote("");
      setNoteId("");
    } catch (error) {
      console.error(error);
    }
  };

  const clearInput = () => {
    setNote("");
    setNoteId("");
  };
  useEffect(() => {
    fetchAllNotes();
  }, []);

  return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-l">AWS Amplify Notes</h1>
      <form onSubmit={handleSubmit} className="mb3 flex">
        <div className="ba flex items-center justify-between bg-white">
          <input
            type="text"
            name="note"
            id="note-input"
            className="pa2 f4 bn outline-0"
            placeholder="Write your note"
            onChange={handleChange}
            value={note}
          />

          <button
            type="button"
            className={`${note ? "o-100 " : "o-0"} mr1 ml1`}
            onClick={clearInput}
          >
            🅧
          </button>
        </div>

        <button type="submit" className="pa2 f4">
          {hasExistingNote() ? "Update Note" : "Add Note"}
        </button>
      </form>

      <div>
        {notes.map(item => (
          <div key={item.id} className="flex items-center">
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
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
